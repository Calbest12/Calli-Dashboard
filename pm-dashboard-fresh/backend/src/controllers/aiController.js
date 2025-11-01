const { query } = require('../config/database');

let aiService;
try {
  aiService = require('../services/ai/aiService');
  console.log('âœ… AI service loaded successfully');
} catch (error) {
  console.warn('âš ï¸ AI service not available:', error.message);
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
  async chat(req, res) {
    try {
      const { message, context, projectId } = req.body;
      const user = req.user; 

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      console.log('ðŸ¤– AI Chat request from user:', user.name, 'ID:', user.id);

      console.log('ðŸ“Š Fetching user projects...');
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
      console.log(`ðŸ“Š Found ${userProjects.length} projects for user ${user.name}`);

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
        console.log('ðŸŽ¯ Current project:', currentProject?.name || 'Not found');
      } else if (userProjects.length > 0) {
        currentProject = userProjects.find(p => p.status === 'active') || userProjects[0];
        console.log('ðŸŽ¯ Auto-selected current project:', currentProject.name);
      }

      const cleanContext = {
        user: {
          name: user.name,
          role: user.role
        },
        portfolio: {
          totalProjects: userProjects.length,
          activeProjects: userProjects.filter(p => p.status === 'active').length,
          avgProgress: userProjects.length > 0 ? 
            Math.round(userProjects.reduce((sum, p) => sum + (p.pm_progress || 0), 0) / userProjects.length) : 0
        },
        currentProject: currentProject ? {
          name: currentProject.name,
          status: currentProject.status,
          priority: currentProject.priority,
          teamSize: parseInt(currentProject.team_count) || 0,
          pmProgress: currentProject.pm_progress || 0,
          leadershipProgress: currentProject.leadership_progress || 0
        } : null,
        timestamp: new Date().toISOString()
      };

      const enhancedMessage = this.createCleanPrompt(message, cleanContext);

      console.log('ðŸ¤– Calling AI service with clean context...');
      const response = await aiService.processChat(enhancedMessage, cleanContext);

      const cleanedResponse = this.cleanAIResponse(response.content);

      try {
        await query(
          `INSERT INTO ai_interactions (user_id, project_id, query, response, model_used, tokens_used, context_data)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            user.id,
            currentProject?.id || null,
            message,
            cleanedResponse,
            response.model,
            response.tokensUsed || 0,
            JSON.stringify(cleanContext)
          ]
        );
        console.log('ðŸ“ AI interaction logged to database');
      } catch (logError) {
        console.warn('Failed to log AI interaction:', logError.message);
      }

      res.json({
        success: true,
        response: cleanedResponse,
        model: response.model,
        tokensUsed: response.tokensUsed
      });

    } catch (error) {
      console.error('AI chat error:', error);
      res.status(500).json({
        success: false,
        error: 'AI service temporarily unavailable'
      });
    }
  }

  createCleanPrompt(userMessage, context) {
    const systemContext = `You are an expert project management consultant providing insights to ${context.user.name}, a ${context.user.role}. 

Current Portfolio Context:
- Total Projects: ${context.portfolio.totalProjects}
- Active Projects: ${context.portfolio.activeProjects}
- Average Progress: ${context.portfolio.avgProgress}/7 (${Math.round((context.portfolio.avgProgress/7)*100)}%)

${context.currentProject ? `Current Project Focus: "${context.currentProject.name}"
- Status: ${context.currentProject.status}
- Priority: ${context.currentProject.priority}
- Team Size: ${context.currentProject.teamSize} members
- PM Progress: ${context.currentProject.pmProgress}/7 (${Math.round((context.currentProject.pmProgress/7)*100)}%)
- Leadership Progress: ${context.currentProject.leadershipProgress}/7 (${Math.round((context.currentProject.leadershipProgress/7)*100)}%)` : 'No specific project selected'}

Instructions:
- Provide practical, actionable advice
- Focus on project management best practices
- Use specific metrics when relevant
- Keep responses professional and concise
- Do not mention any technical implementation details
- Do not reference file names, code, or system internals
- Speak directly to the user as their consultant

User Question: ${userMessage}`;

    return systemContext;
  }

  cleanAIResponse(responseText) {
    if (!responseText) return 'I apologize, but I\'m unable to provide a response at this time.';

    let cleaned = responseText
      .replace(/\b\w+\.(js|jsx|ts|tsx|json|md|txt|csv)\b/gi, '')
      .replace(/\/api\/[a-zA-Z\/\-_]+/gi, '')
      .replace(/\b(apiService|query|response|console\.log|useState|useEffect)\b/gi, '')
      .replace(/\berror:\s*[a-zA-Z0-9\s]+/gi, '')
      .replace(/\b[a-zA-Z]+Controller\b/gi, '')
      .replace(/\b[a-zA-Z]+Service\b/gi, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*,/g, ',')
      .trim();

    if (cleaned.length < 20) {
      return 'Thank you for your question. I can help you with project management insights and recommendations. Could you provide more details about what specific area you\'d like guidance on?';
    }

    return cleaned;
  }

  async getProjectInsights(req, res) {
    try {
      const { projectId } = req.params;
      const user = req.user;

      console.log('ðŸ§  Generating clean AI insights for project:', projectId, 'User:', user.name);

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

      const historyResult = await query(
        `SELECT action, description, created_at, action_type
         FROM project_history 
         WHERE project_id = $1 
         ORDER BY created_at DESC 
         LIMIT 5`,
        [projectId]
      );

      let finalInsights = [];
      
      try {
        if (aiService && aiService.processChat) {
          console.log('ðŸš€ Using AI service for enhanced insights...');
          
          const insightPrompt = `As a senior project management consultant, analyze this project and provide exactly 3 actionable insights:

Project Overview:
- Name: "${project.name}"
- Status: ${project.status}
- Priority: ${project.priority}
- Team Size: ${project.team_count || 0} members
- PM Progress: ${project.pm_progress || 0}/7 (${Math.round(((project.pm_progress || 0)/7)*100)}%)
- Leadership Development: ${project.leadership_progress || 0}/7 (${Math.round(((project.leadership_progress || 0)/7)*100)}%)
- Change Management: ${project.change_mgmt_progress || 0}/7 (${Math.round(((project.change_mgmt_progress || 0)/7)*100)}%)
- Career Development: ${project.career_dev_progress || 0}/7 (${Math.round(((project.career_dev_progress || 0)/7)*100)}%)
${project.avg_feedback ? `- Team Feedback Score: ${parseFloat(project.avg_feedback).toFixed(1)}/7` : ''}

Recent Activity Summary:
${historyResult.rows.map(h => `- ${h.description}`).join('\n') || '- No recent activity recorded'}

Provide exactly 3 insights in this JSON format:
{
  "insights": [
    {"type": "success", "message": "specific strength or achievement worth celebrating"},
    {"type": "warning", "message": "specific area needing attention with clear action"},
    {"type": "info", "message": "strategic recommendation for next steps"}
  ]
}

Requirements:
- Focus on actionable business insights
- Use specific progress percentages when relevant
- Recommend concrete next steps
- Keep each insight under 120 characters
- Use professional consulting language
- Do not mention any technical terms, files, or system details`;

          const aiContext = {
            user: { name: user.name, role: user.role },
            isInsightGeneration: true
          };

          const aiResponse = await aiService.processChat(insightPrompt, aiContext);
          
          try {
            const parsed = JSON.parse(aiResponse.content);
            if (parsed.insights && Array.isArray(parsed.insights)) {
              finalInsights = parsed.insights.map(insight => ({
                type: insight.type || 'info',
                message: this.cleanInsightMessage(insight.message || 'Analysis completed'),
                source: 'ai_consultant'
              }));
              console.log('âœ… AI insights parsed successfully:', finalInsights.length);
            }
          } catch (parseError) {
            console.log('âš ï¸ Could not parse AI response as JSON, using fallback');
            finalInsights = this.generateRuleBasedInsights(project, historyResult.rows);
          }
        }
      } catch (aiError) {
        console.log('âš ï¸ AI service error, using rule-based insights:', aiError.message);
        finalInsights = this.generateRuleBasedInsights(project, historyResult.rows);
      }

      if (finalInsights.length === 0) {
        finalInsights = this.generateRuleBasedInsights(project, historyResult.rows);
      }
      finalInsights = finalInsights.slice(0, 3);

      const insights = {
        summary: this.generateCleanProjectSummary(project),
        recommendations: finalInsights.map(insight => insight.message),
        detailedInsights: finalInsights,
        confidence: finalInsights[0]?.source === 'ai_consultant' ? 0.9 : 0.75,
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
        recentActivity: historyResult.rows.slice(0, 3),
        lastGenerated: new Date().toISOString(),
        source: finalInsights[0]?.source || 'consultant_analysis'
      };

      console.log('âœ… Clean insights generated:', {
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

  cleanInsightMessage(message) {
    if (!message) return 'Analysis completed';

    return message
      .replace(/\b\w+\.(js|jsx|ts|tsx|json|md|txt|csv)\b/gi, '')
      .replace(/\/api\/[a-zA-Z\/\-_]+/gi, '')
      .replace(/\b(function|method|endpoint|query|response|error|log)\b/gi, '')
      .replace(/\b(aiService|apiService|controller|service)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  generateCleanProjectSummary(project) {
    const avgScore = (
      (project.pm_progress || 0) + 
      (project.leadership_progress || 0) + 
      (project.change_mgmt_progress || 0) + 
      (project.career_dev_progress || 0)
    ) / 4;

    const progressPercentage = Math.round((avgScore / 7) * 100);
    
    let statusDesc = 'in early development';
    if (avgScore >= 6) statusDesc = 'performing excellently';
    else if (avgScore >= 5) statusDesc = 'performing well';
    else if (avgScore >= 3) statusDesc = 'showing steady progress';

    return `Project "${project.name}" is currently ${project.status} and ${statusDesc} with ${progressPercentage}% overall progress across key areas. The team has ${project.team_count || 0} active members.`;
  }

  generateRuleBasedInsights(project, history) {
    const insights = [];
    
    const pmProgress = project.pm_progress || 0;
    const avgProgress = (
      (project.pm_progress || 0) + 
      (project.leadership_progress || 0) + 
      (project.change_mgmt_progress || 0) + 
      (project.career_dev_progress || 0)
    ) / 4;
    const progressPercentage = Math.round((avgProgress / 7) * 100);

    if (avgProgress >= 6) {
      insights.push({
        type: 'success',
        message: `Excellent progress at ${progressPercentage}% - project is on track for successful delivery`,
        source: 'consultant_analysis'
      });
    } else if (avgProgress <= 2) {
      insights.push({
        type: 'warning',
        message: `Low progress at ${progressPercentage}% - recommend weekly progress reviews and clearer milestones`,
        source: 'consultant_analysis'
      });
    }

    const teamCount = parseInt(project.team_count) || 0;
    if (teamCount === 0) {
      insights.push({
        type: 'warning',
        message: 'No team members assigned - add team members to accelerate project delivery',
        source: 'consultant_analysis'
      });
    } else if (teamCount < 3 && project.priority === 'critical') {
      insights.push({
        type: 'warning',
        message: `Critical project needs more resources - current team of ${teamCount} may be insufficient`,
        source: 'consultant_analysis'
      });
    } else if (teamCount > 8) {
      insights.push({
        type: 'info',
        message: `Large team of ${teamCount} members - ensure clear communication channels and role definitions`,
        source: 'consultant_analysis'
      });
    }

    const recentActivity = history.filter(h => {
      const activityDate = new Date(h.created_at);
      const daysSince = (new Date() - activityDate) / (1000 * 60 * 60 * 24);
      return daysSince <= 7;
    });

    if (recentActivity.length === 0) {
      insights.push({
        type: 'info',
        message: 'No recent activity - schedule team check-in to maintain project momentum',
        source: 'consultant_analysis'
      });
    } else if (recentActivity.length > 5) {
      insights.push({
        type: 'success',
        message: 'High activity level indicates strong team engagement and project momentum',
        source: 'consultant_analysis'
      });
    }

    return insights.slice(0, 3);
  }
}

module.exports = new AIController();