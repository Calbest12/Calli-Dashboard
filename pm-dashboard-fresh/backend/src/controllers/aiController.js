const AIService = require('../services/ai/aiService');
const { Pool } = require('pg');

class AIController {
  constructor() {
    this.dbPool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'project_manager',
      password: process.env.DB_PASSWORD || 'postgres',
      port: process.env.DB_PORT || 5432,
    });
  }

  async chat(req, res) {
    try {
      console.log('🤖 Enhanced AI Chat Request');
      console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
      console.log('👤 User:', req.user?.name, req.user?.role);

      const { message, projectId } = req.body;
      
      // Validate input
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Message is required and must be a non-empty string'
        });
      }

      if (message.trim().length > 2000) {
        return res.status(400).json({
          success: false,
          error: 'Message too long. Please keep messages under 2000 characters.'
        });
      }

      // Build comprehensive context
      const context = await this.buildComprehensiveContext(req.user, projectId, message);
      
      console.log('🔍 Context built with:', {
        userId: context.user?.id,
        projectId: context.projectId,
        hasProjects: context.projects?.length > 0,
        hasAssessments: context.assessments?.length > 0,
        hasGoals: context.goals?.length > 0
      });

      // Process with enhanced AI service
      const aiResponse = await AIService.processChat(message.trim(), context);
      
      console.log('✅ AI Response generated:', {
        model: aiResponse.model,
        tokensUsed: aiResponse.tokensUsed,
        documentsUsed: aiResponse.documentsUsed,
        dataSourcesUsed: aiResponse.dataSourcesUsed
      });

      // Log comprehensive interaction
      await this.logEnhancedInteraction(
        req.user.id, 
        projectId, 
        message.trim(), 
        aiResponse.content, 
        {
          model: aiResponse.model,
          tokensUsed: aiResponse.tokensUsed,
          documentsUsed: aiResponse.documentsUsed,
          dataSourcesUsed: aiResponse.dataSourcesUsed,
          contextSources: this.getContextSources(context),
          userAgent: req.headers['user-agent'],
          timestamp: new Date().toISOString()
        }
      );

      res.json({
        success: true,
        response: aiResponse.content,
        model: aiResponse.model,
        metadata: {
          tokensUsed: aiResponse.tokensUsed,
          documentsUsed: aiResponse.documentsUsed,
          dataSourcesUsed: aiResponse.dataSourcesUsed,
          contextEnhanced: true,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Enhanced AI chat error:', error);
      
      // Log error for debugging
      try {
        if (req.user?.id) {
          await this.logEnhancedInteraction(
            req.user.id,
            req.body.projectId,
            req.body.message || 'Error before processing',
            'Error: ' + error.message,
            {
              error: true,
              errorType: error.constructor.name,
              errorMessage: error.message,
              timestamp: new Date().toISOString()
            }
          );
        }
      } catch (logError) {
        console.error('❌ Failed to log error interaction:', logError.message);
      }

      if (error.message.includes('API key')) {
        res.status(503).json({
          success: false,
          error: 'AI service temporarily unavailable. Please try again later.'
        });
      } else if (error.message.includes('rate limit') || error.message.includes('quota')) {
        res.status(429).json({
          success: false,
          error: 'Service temporarily busy. Please try again in a moment.'
        });
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        res.status(503).json({
          success: false,
          error: 'Network connectivity issue. Please check your connection and try again.'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'I apologize, but I\'m experiencing technical difficulties. Please try again.',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    }
  }

  async buildComprehensiveContext(user, projectId, message) {
    const context = {
      user: user,
      projectId: projectId,
      projects: [],
      assessments: [],
      goals: [],
      team: [],
      interactions: []
    };

    try {
      // Get user's projects (recent and relevant)
      const projectsQuery = `
        SELECT p.*, 
               COUNT(DISTINCT pt.user_id) as team_size,
               COUNT(DISTINCT f.id) as feedback_count
        FROM projects p
        LEFT JOIN project_teams pt ON p.id = pt.project_id
        LEFT JOIN feedback f ON p.id = f.project_id
        WHERE p.user_id = $1 
           OR pt.user_id = $1
           OR p.name ILIKE $2 
           OR p.description ILIKE $2
        GROUP BY p.id
        ORDER BY 
          CASE WHEN p.id = $3 THEN 0 ELSE 1 END,
          p.updated_at DESC
        LIMIT 10
      `;
      const projectsResult = await this.dbPool.query(projectsQuery, [
        user.id, 
        `%${message}%`, 
        projectId || 0
      ]);
      context.projects = projectsResult.rows;

      // Get user's assessments
      const assessmentsQuery = `
        SELECT 'leadership_diamond' as type, 
               ld.task_score, ld.team_score, ld.individual_score, ld.organization_score,
               ld.responses, ld.created_at
        FROM leadership_diamond_assessments ld
        WHERE ld.user_id = $1
        UNION ALL
        SELECT 'value' as type,
               va.vision_score as task_score, va.alignment_score as team_score, 
               va.understanding_score as individual_score, va.enactment_score as organization_score,
               va.responses, va.created_at
        FROM value_assessments va
        WHERE va.user_id = $1
        ORDER BY created_at DESC
        LIMIT 5
      `;
      const assessmentsResult = await this.dbPool.query(assessmentsQuery, [user.id]);
      context.assessments = assessmentsResult.rows;

      // Get career development goals
      const goalsQuery = `
        SELECT cg.*, 
               COUNT(DISTINCT lr.id) as learning_resources_count,
               COUNT(DISTINCT gph.id) as progress_history_count
        FROM career_development_goals cg
        LEFT JOIN learning_resources lr ON cg.id = lr.goal_id
        LEFT JOIN goal_progress_history gph ON cg.id = gph.goal_id
        WHERE cg.user_id = $1
           OR cg.description ILIKE $2
           OR cg.notes ILIKE $2
        GROUP BY cg.id
        ORDER BY 
          CASE WHEN cg.status = 'active' THEN 0 ELSE 1 END,
          cg.updated_at DESC
        LIMIT 10
      `;
      const goalsResult = await this.dbPool.query(goalsQuery, [user.id, `%${message}%`]);
      context.goals = goalsResult.rows;

      // Get team information for context
      const teamQuery = `
        SELECT DISTINCT u.id, u.name, u.role, u.avatar,
               COUNT(DISTINCT p.id) as shared_projects
        FROM users u
        JOIN project_teams pt ON u.id = pt.user_id
        JOIN projects p ON pt.project_id = p.id
        WHERE p.user_id = $1 OR pt.user_id = $1
        AND u.id != $1
        GROUP BY u.id, u.name, u.role, u.avatar
        ORDER BY shared_projects DESC
        LIMIT 10
      `;
      const teamResult = await this.dbPool.query(teamQuery, [user.id]);
      context.team = teamResult.rows;

      // Get recent relevant interactions for continuity
      const interactionsQuery = `
        SELECT query, response, context_data, created_at
        FROM ai_interactions
        WHERE user_id = $1
          AND (query ILIKE $2 OR response ILIKE $2)
        ORDER BY created_at DESC
        LIMIT 3
      `;
      const interactionsResult = await this.dbPool.query(interactionsQuery, [
        user.id, 
        `%${message.split(' ').slice(0, 3).join(' ')}%`
      ]);
      context.interactions = interactionsResult.rows;

    } catch (dbError) {
      console.error('❌ Database context building error:', dbError.message);
      // Continue with partial context rather than failing
    }

    return context;
  }

  getContextSources(context) {
    return {
      projects: context.projects?.length || 0,
      assessments: context.assessments?.length || 0,
      goals: context.goals?.length || 0,
      teamMembers: context.team?.length || 0,
      interactions: context.interactions?.length || 0
    };
  }

  async logEnhancedInteraction(userId, projectId, query, response, metadata = {}) {
    try {
      if (!userId) return;
      
      await this.dbPool.query(
        `INSERT INTO ai_interactions (user_id, project_id, query, response, model_used, tokens_used, context_data, document_context)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userId, 
          projectId || null, 
          query, 
          response, 
          metadata.model || 'enhanced-ai-service',
          metadata.tokensUsed || 0,
          JSON.stringify(metadata),
          JSON.stringify(metadata.dataSourcesUsed || {})
        ]
      );
    } catch (error) {
      console.warn('⚠️ Failed to log enhanced interaction:', error.message);
    }
  }

  async getProjectInsights(req, res) {
    try {
      const { projectId } = req.params;
      
      if (!projectId || isNaN(parseInt(projectId))) {
        return res.status(400).json({
          success: false,
          error: 'Valid project ID is required'
        });
      }

      console.log(`🔍 Getting AI insights for project ${projectId}`);

      // Get comprehensive project data
      const projectData = await this.getProjectData(parseInt(projectId), req.user.id);
      
      if (!projectData.project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found or access denied'
        });
      }

      // Generate AI insights using comprehensive context
      const insights = await this.generateProjectInsights(projectData);

      res.json({
        success: true,
        data: {
          projectId: parseInt(projectId),
          projectName: projectData.project.name,
          insights: insights,
          metadata: {
            generatedAt: new Date().toISOString(),
            dataPoints: this.countDataPoints(projectData),
            confidenceLevel: this.calculateConfidenceLevel(projectData)
          }
        }
      });

    } catch (error) {
      console.error('❌ Project insights error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate project insights',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getProjectData(projectId, userId) {
    const data = { project: null, team: [], feedback: [], progress: [], risks: [] };

    try {
      // Get project details
      const projectQuery = `
        SELECT p.*, u.name as creator_name, u.role as creator_role,
               COUNT(DISTINCT pt.user_id) as team_size,
               COUNT(DISTINCT f.id) as feedback_count,
               AVG(f.rating) as avg_rating
        FROM projects p
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN project_teams pt ON p.id = pt.project_id
        LEFT JOIN feedback f ON p.id = f.project_id
        WHERE p.id = $1
        AND (p.user_id = $2 OR pt.user_id = $2 OR $3 = 'Executive Leader' OR $3 = 'AI Lead')
        GROUP BY p.id, u.name, u.role
      `;
      const projectResult = await this.dbPool.query(projectQuery, [projectId, userId, req.user?.role || 'Team Member']);
      
      if (projectResult.rows.length === 0) {
        return data;
      }
      
      data.project = projectResult.rows[0];

      // Get team members
      const teamQuery = `
        SELECT u.id, u.name, u.role, u.avatar, pt.joined_at,
               COUNT(DISTINCT f.id) as feedback_given
        FROM project_teams pt
        JOIN users u ON pt.user_id = u.id
        LEFT JOIN feedback f ON pt.user_id = f.user_id AND f.project_id = $1
        WHERE pt.project_id = $1
        GROUP BY u.id, u.name, u.role, u.avatar, pt.joined_at
        ORDER BY pt.joined_at ASC
      `;
      const teamResult = await this.dbPool.query(teamQuery, [projectId]);
      data.team = teamResult.rows;

      // Get recent feedback
      const feedbackQuery = `
        SELECT f.*, u.name as user_name, u.role as user_role
        FROM feedback f
        JOIN users u ON f.user_id = u.id
        WHERE f.project_id = $1
        ORDER BY f.created_at DESC
        LIMIT 10
      `;
      const feedbackResult = await this.dbPool.query(feedbackQuery, [projectId]);
      data.feedback = feedbackResult.rows;

      // Get progress data if available
      // Note: This would depend on your specific progress tracking implementation

    } catch (error) {
      console.error('❌ Error getting project data:', error.message);
    }

    return data;
  }

  async generateProjectInsights(projectData) {
    try {
      const { project, team, feedback } = projectData;
      
      // Build insights prompt
      const insightsPrompt = `Analyze this project data and provide actionable insights:

PROJECT: ${project.name}
Description: ${project.description}
Status: ${project.status}
Team Size: ${team.length}
Feedback Count: ${feedback.length}
Average Rating: ${project.avg_rating ? project.avg_rating.toFixed(1) : 'N/A'}

TEAM COMPOSITION:
${team.map(member => `- ${member.name} (${member.role})`).join('\n')}

RECENT FEEDBACK:
${feedback.slice(0, 5).map(f => `- Rating: ${f.rating}/5, Comment: "${f.feedback_text}"`).join('\n')}

Provide specific insights about:
1. Project health and momentum
2. Team dynamics and engagement
3. Risk areas requiring attention
4. Recommendations for improvement
5. Success indicators and trends`;

      const context = {
        user: { name: 'Project Analyst', role: 'AI Lead' },
        projectId: project.id,
        projects: [project],
        team: team,
        feedback: feedback
      };

      const aiResponse = await AIService.processChat(insightsPrompt, context);
      
      return {
        summary: this.extractInsightsSummary(aiResponse.content),
        detailed: aiResponse.content,
        recommendations: this.extractRecommendations(aiResponse.content),
        riskAreas: this.extractRiskAreas(projectData),
        successMetrics: this.calculateSuccessMetrics(projectData)
      };

    } catch (error) {
      console.error('❌ Error generating insights:', error.message);
      return {
        summary: 'Unable to generate insights at this time',
        detailed: 'Insights generation temporarily unavailable',
        recommendations: [],
        riskAreas: [],
        successMetrics: {}
      };
    }
  }

  extractInsightsSummary(content) {
    // Extract first paragraph or first 200 characters as summary
    const firstParagraph = content.split('\n\n')[0];
    return firstParagraph.length > 200 ? firstParagraph.substring(0, 200) + '...' : firstParagraph;
  }

  extractRecommendations(content) {
    // Extract bullet points or numbered items as recommendations
    const recommendations = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.match(/^[\d\-\*\•]\s+/) || line.toLowerCase().includes('recommend')) {
        recommendations.push(line.replace(/^[\d\-\*\•]\s+/, '').trim());
      }
    }
    
    return recommendations.slice(0, 5); // Limit to top 5 recommendations
  }

  extractRiskAreas(projectData) {
    const risks = [];
    const { project, team, feedback } = projectData;
    
    // Analyze for potential risks based on data
    if (team.length < 2) {
      risks.push({ type: 'team', level: 'medium', description: 'Small team size may limit project capacity' });
    }
    
    if (feedback.length > 0) {
      const avgRating = feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length;
      if (avgRating < 3) {
        risks.push({ type: 'satisfaction', level: 'high', description: 'Low satisfaction ratings require attention' });
      }
    }
    
    if (project.status === 'active' && !project.target_date) {
      risks.push({ type: 'timeline', level: 'medium', description: 'No target completion date set' });
    }
    
    return risks;
  }

  calculateSuccessMetrics(projectData) {
    const { project, team, feedback } = projectData;
    
    return {
      teamEngagement: team.length > 0 ? Math.min(100, team.length * 25) : 0,
      feedbackScore: feedback.length > 0 ? 
        (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length) * 20 : 0,
      projectMomentum: project.status === 'active' ? 75 : project.status === 'completed' ? 100 : 25,
      overallHealth: 0 // Calculate based on other metrics
    };
  }

  countDataPoints(projectData) {
    return {
      projectDetails: projectData.project ? 1 : 0,
      teamMembers: projectData.team?.length || 0,
      feedbackEntries: projectData.feedback?.length || 0,
      totalDataPoints: (projectData.project ? 1 : 0) + 
                      (projectData.team?.length || 0) + 
                      (projectData.feedback?.length || 0)
    };
  }

  calculateConfidenceLevel(projectData) {
    const dataPoints = this.countDataPoints(projectData);
    
    if (dataPoints.totalDataPoints >= 10) return 'high';
    if (dataPoints.totalDataPoints >= 5) return 'medium';
    return 'low';
  }

  async healthCheck(req, res) {
    try {
      const aiHealth = await AIService.healthCheck();
      
      // Test database connection
      await this.dbPool.query('SELECT 1');
      
      res.json({
        success: true,
        data: {
          ...aiHealth,
          controllerStatus: 'healthy',
          databaseConnected: true,
          enhancedFeatures: true,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('❌ Health check error:', error);
      res.status(503).json({
        success: false,
        error: 'Health check failed',
        details: error.message
      });
    }
  }
}

module.exports = new AIController();