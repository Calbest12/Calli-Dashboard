// Enhanced AI Controller for PM Dashboard - Real AI Insights
const { query } = require('../config/database');
const { validationResult } = require('express-validator');

// Try to load AI service, with fallback
let aiService;
try {
  aiService = require('../services/ai/aiService');
} catch (error) {
  console.warn('⚠️ AI service not available:', error.message);
  // Create fallback AI service
  aiService = {
    processChat: async (message, context) => {
      return {
        content: `I received your message: "${message}". AI service is not fully configured yet. Please set up your OpenAI API key to enable full AI capabilities.`,
        model: 'fallback-mode',
        tokensUsed: 0
      };
    }
  };
}

class AIController {
  // AI Chat endpoint
  async chat(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { message, context, projectId } = req.body;
      const user = req.user; // From auth middleware - real database user

      console.log('🔍 AI Chat - User:', user.name, 'ID:', user.id);

      // Get ALL projects the user is assigned to
      console.log('📊 Fetching user projects...');
      const userProjectsResult = await query(
        `SELECT p.id, p.name, p.description, p.status, p.priority, 
                p.pm_progress, p.leadership_progress, p.change_mgmt_progress, p.career_dev_progress,
                COUNT(ptm2.id) as team_count,
                AVG(pf.overall_average) as avg_feedback
         FROM projects p
         INNER JOIN project_team_members ptm ON p.id = ptm.project_id
         LEFT JOIN project_team_members ptm2 ON p.id = ptm2.project_id
         LEFT JOIN project_feedback pf ON p.id = pf.project_id
         WHERE ptm.user_id = $1
         GROUP BY p.id, p.name, p.description, p.status, p.priority, 
                  p.pm_progress, p.leadership_progress, p.change_mgmt_progress, p.career_dev_progress
         ORDER BY 
           CASE p.priority 
             WHEN 'critical' THEN 1 
             WHEN 'high' THEN 2 
             WHEN 'medium' THEN 3 
             WHEN 'low' THEN 4 
           END,
           p.status = 'active' DESC`,
        [user.id]
      );

      const userProjects = userProjectsResult.rows;
      console.log(`📊 Found ${userProjects.length} projects for user ${user.name}`);

      // Get specific project details if projectId provided
      let currentProject = null;
      if (projectId) {
        const projectResult = await query(
          `SELECT p.*, 
                  COUNT(ptm.id) as team_count,
                  AVG(pf.overall_average) as avg_feedback
           FROM projects p
           LEFT JOIN project_team_members ptm ON p.id = ptm.project_id
           LEFT JOIN project_feedback pf ON p.id = pf.project_id
           WHERE p.id = $1
           GROUP BY p.id`,
          [projectId]
        );
        currentProject = projectResult.rows[0];
        console.log('🎯 Current project:', currentProject?.name || 'Not found');
      } else if (userProjects.length > 0) {
        // Use the highest priority active project as current project
        currentProject = userProjects.find(p => p.status === 'active') || userProjects[0];
        console.log('🎯 Auto-selected current project:', currentProject.name);
      }

      // Enhance context with real database data
      const enhancedContext = {
        ...context,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        userProjects: userProjects,
        currentProject: currentProject,
        project: currentProject,
        timestamp: new Date().toISOString()
      };

      console.log('🤖 Calling AI service with enhanced context...');
      console.log('📊 Context summary:', {
        user: enhancedContext.user.name,
        projectCount: enhancedContext.userProjects.length,
        currentProject: enhancedContext.currentProject?.name || 'None'
      });

      const response = await aiService.processChat(message, enhancedContext);

      // Log the interaction to database
      try {
        await query(
          `INSERT INTO ai_interactions (user_id, project_id, query, response, model_used, tokens_used, context_data)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            user.id,
            currentProject?.id || null,
            message,
            response.content,
            response.model,
            response.tokensUsed || 0,
            JSON.stringify(enhancedContext)
          ]
        );
        console.log('📝 AI interaction logged to database');
      } catch (logError) {
        console.warn('Failed to log AI interaction:', logError.message);
        // Continue even if logging fails
      }

      res.json({
        success: true,
        response: response.content,
        model: response.model,
        tokensUsed: response.tokensUsed,
        debug: {
          userProjects: userProjects.length,
          currentProject: currentProject?.name || null
        }
      });

    } catch (error) {
      console.error('AI chat error:', error);
      res.status(500).json({
        success: false,
        error: 'AI service temporarily unavailable'
      });
    }
  }

  // ENHANCED Get AI insights for a specific project
  async getProjectInsights(req, res) {
    try {
      const { projectId } = req.params;
      const user = req.user; // Real database user

      console.log('🧠 Generating AI insights for project:', projectId, 'User:', user.name);

      // Get comprehensive project details from database
      const projectResult = await query(
        `SELECT p.*, 
                COUNT(ptm.id) as team_count,
                AVG(pf.overall_average) as avg_feedback,
                ARRAY_AGG(DISTINCT u.name) FILTER (WHERE u.name IS NOT NULL) as team_names
         FROM projects p
         LEFT JOIN project_team_members ptm ON p.id = ptm.project_id
         LEFT JOIN users u ON ptm.user_id = u.id
         LEFT JOIN project_feedback pf ON p.id = pf.project_id
         WHERE p.id = $1
         GROUP BY p.id`,
        [projectId]
      );

      if (projectResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      const project = projectResult.rows[0];

      // Get recent project history for context
      const historyResult = await query(
        `SELECT action, description, created_at, action_type
         FROM project_history 
         WHERE project_id = $1 
         ORDER BY created_at DESC 
         LIMIT 10`,
        [projectId]
      );

      // Get recent comments for sentiment analysis
      const commentsResult = await query(
        `SELECT content, created_at
         FROM project_comments 
         WHERE project_id = $1 
         ORDER BY created_at DESC 
         LIMIT 5`,
        [projectId]
      );

      // Try to use AI service for enhanced insights
      let aiGeneratedInsights = null;
      
      try {
        if (aiService && aiService.processChat) {
          console.log('🚀 Using AI service for advanced insights...');
          
          const insightPrompt = `Analyze this project data and provide exactly 3 actionable insights in JSON format:

Project: "${project.name}"
Status: ${project.status}
Priority: ${project.priority}
PM Progress: ${project.pm_progress}/7
Leadership: ${project.leadership_progress}/7
Change Management: ${project.change_mgmt_progress}/7
Career Development: ${project.career_dev_progress}/7
Team Size: ${project.team_count}
Average Feedback: ${project.avg_feedback || 'No feedback yet'}
Team Members: ${project.team_names ? project.team_names.join(', ') : 'None'}

Recent Activity:
${historyResult.rows.map(h => `- ${h.description} (${h.action_type})`).join('\n')}

Provide response as JSON:
{
  "insights": [
    {"type": "success|warning|info", "message": "actionable insight 1"},
    {"type": "success|warning|info", "message": "actionable insight 2"},
    {"type": "success|warning|info", "message": "actionable insight 3"}
  ]
}

Types:
- success: Something going well
- warning: Needs attention
- info: Recommendation or neutral observation

Keep messages under 80 characters and actionable.`;

          const aiContext = {
            user: { id: user.id, name: user.name, role: user.role },
            project: project,
            isInsightGeneration: true
          };

          const aiResponse = await aiService.processChat(insightPrompt, aiContext);
          
          // Try to parse AI response as JSON
          try {
            const parsedResponse = JSON.parse(aiResponse.content);
            if (parsedResponse.insights && Array.isArray(parsedResponse.insights)) {
              aiGeneratedInsights = parsedResponse.insights.map(insight => ({
                type: insight.type || 'info',
                message: insight.message || 'AI analysis completed',
                source: 'ai'
              }));
              console.log('✅ AI insights parsed successfully:', aiGeneratedInsights.length);
            }
          } catch (parseError) {
            console.log('⚠️ Could not parse AI response as JSON, using text analysis');
            // Fallback: extract insights from text
            aiGeneratedInsights = this.extractInsightsFromText(aiResponse.content);
          }
        }
      } catch (aiError) {
        console.log('⚠️ AI service error, using fallback insights:', aiError.message);
      }

      // Generate rule-based insights as fallback or supplement
      const ruleBasedInsights = this.generateRuleBasedInsights(project, historyResult.rows, commentsResult.rows);

      // Combine AI and rule-based insights, prioritizing AI if available
      let finalInsights = aiGeneratedInsights || ruleBasedInsights;
      
      // Ensure we have exactly 3 insights
      if (finalInsights.length < 3) {
        finalInsights = [...finalInsights, ...ruleBasedInsights].slice(0, 3);
      } else if (finalInsights.length > 3) {
        finalInsights = finalInsights.slice(0, 3);
      }

      // Build comprehensive response
      const insights = {
        summary: this.generateProjectSummary(project),
        recommendations: finalInsights.map(insight => insight.message),
        detailedInsights: finalInsights,
        confidence: aiGeneratedInsights ? 0.9 : 0.75,
        metrics: {
          status: project.status,
          priority: project.priority,
          teamSize: parseInt(project.team_count) || 0,
          avgFeedback: project.avg_feedback ? parseFloat(project.avg_feedback).toFixed(2) : null,
          progressScores: {
            pm: project.pm_progress || 0,
            leadership: project.leadership_progress || 0,
            changeManagement: project.change_mgmt_progress || 0,
            careerDev: project.career_dev_progress || 0
          }
        },
        recentActivity: historyResult.rows.slice(0, 5),
        lastGenerated: new Date().toISOString(),
        source: aiGeneratedInsights ? 'ai_enhanced' : 'rule_based'
      };

      console.log('✅ Generated insights:', {
        source: insights.source,
        insightCount: finalInsights.length,
        confidence: insights.confidence
      });

      res.json({
        success: true,
        insights,
        cached: false
      });

    } catch (error) {
      console.error('AI insights error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate insights'
      });
    }
  }

  // Helper method to generate project summary
  generateProjectSummary(project) {
    const avgScore = (
      (project.pm_progress || 0) + 
      (project.leadership_progress || 0) + 
      (project.change_mgmt_progress || 0) + 
      (project.career_dev_progress || 0)
    ) / 4;

    let statusDesc = 'progressing';
    if (avgScore >= 6) statusDesc = 'performing excellently';
    else if (avgScore >= 5) statusDesc = 'performing well';
    else if (avgScore >= 3) statusDesc = 'showing steady progress';
    else statusDesc = 'in early stages';

    return `Project "${project.name}" is currently ${project.status} with ${statusDesc} (avg score: ${avgScore.toFixed(1)}/7) and ${project.team_count || 0} team members.`;
  }

  // Helper method to extract insights from AI text response
  extractInsightsFromText(text) {
    const insights = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      if (line.includes('excellent') || line.includes('great') || line.includes('strong')) {
        insights.push({ type: 'success', message: line.trim(), source: 'ai_text' });
      } else if (line.includes('consider') || line.includes('should') || line.includes('recommend')) {
        insights.push({ type: 'info', message: line.trim(), source: 'ai_text' });
      } else if (line.includes('concern') || line.includes('issue') || line.includes('problem')) {
        insights.push({ type: 'warning', message: line.trim(), source: 'ai_text' });
      }
    }
    
    return insights.slice(0, 3);
  }

  // Enhanced rule-based insights
  generateRuleBasedInsights(project, history, comments) {
    const insights = [];
    
    // Progress analysis
    const pmProgress = project.pm_progress || 0;
    const leadershipProgress = project.leadership_progress || 0;
    const changeMgmtProgress = project.change_mgmt_progress || 0;
    const careerDevProgress = project.career_dev_progress || 0;
    const avgProgress = (pmProgress + leadershipProgress + changeMgmtProgress + careerDevProgress) / 4;

    // PM Progress insights
    if (pmProgress >= 6) {
      insights.push({
        type: 'success',
        message: `Excellent PM progress (${pmProgress}/7) - project management is strong`,
        source: 'rule_based'
      });
    } else if (pmProgress <= 2) {
      insights.push({
        type: 'warning',
        message: `PM progress needs attention (${pmProgress}/7) - focus on planning`,
        source: 'rule_based'
      });
    }

    // Team size analysis
    const teamCount = parseInt(project.team_count) || 0;
    if (teamCount === 0) {
      insights.push({
        type: 'warning',
        message: 'No team members assigned - add team members to get started',
        source: 'rule_based'
      });
    } else if (teamCount < 3 && project.priority === 'critical') {
      insights.push({
        type: 'warning',
        message: `Critical project needs more team members (currently ${teamCount})`,
        source: 'rule_based'
      });
    } else if (teamCount > 10) {
      insights.push({
        type: 'info',
        message: `Large team (${teamCount} members) - ensure clear communication`,
        source: 'rule_based'
      });
    }

    // Career development insight
    if (careerDevProgress === 0 && teamCount > 0) {
      insights.push({
        type: 'info',
        message: 'Consider starting career development assessments for team growth',
        source: 'rule_based'
      });
    }

    // Activity-based insights
    const recentActivity = history.filter(h => {
      const activityDate = new Date(h.created_at);
      const daysSince = (new Date() - activityDate) / (1000 * 60 * 60 * 24);
      return daysSince <= 7;
    });

    if (recentActivity.length === 0) {
      insights.push({
        type: 'info',
        message: 'No recent activity - consider updating project progress',
        source: 'rule_based'
      });
    } else if (recentActivity.length > 5) {
      insights.push({
        type: 'success',
        message: 'High activity level - team is actively engaged',
        source: 'rule_based'
      });
    }

    // Priority vs progress mismatch
    if (project.priority === 'critical' && avgProgress < 4) {
      insights.push({
        type: 'warning',
        message: 'Critical priority project needs accelerated progress',
        source: 'rule_based'
      });
    }

    // Status insights
    if (project.status === 'planning' && avgProgress > 4) {
      insights.push({
        type: 'info',
        message: 'Good progress in planning - consider moving to active status',
        source: 'rule_based'
      });
    }

    return insights.slice(0, 3);
  }
}

module.exports = new AIController();