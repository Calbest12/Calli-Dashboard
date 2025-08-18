// AI Service for PM Dashboard - Enhanced with Better AI Integration
const OpenAI = require('openai');

class AIService {
  constructor() {
    // Only initialize OpenAI if API key is provided and valid
    console.log('🤖 Initializing AI Service...');
    
    const apiKey = process.env.OPENAI_API_KEY;
    console.log('🔑 API Key check:', apiKey ? `Present (${apiKey.substring(0, 7)}...)` : 'Missing');
    
    // Check if we have a valid API key format
    if (apiKey && 
        apiKey.startsWith('sk-') && 
        apiKey.length > 20) {
      
      try {
        this.openai = new OpenAI({
          apiKey: apiKey
        });
        console.log('✅ OpenAI service initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize OpenAI:', error.message);
        this.openai = null;
      }
    } else {
      console.log('⚠️ Using fallback mode - no valid OpenAI API key');
      this.openai = null;
    }
  }

  async processChat(message, context) {
    const user = context.user;
    const userProjects = context.userProjects || [];
    const currentProject = context.currentProject;
    const lowerMessage = message.toLowerCase();

    console.log('🤖 Processing chat with context:', {
      user: user?.name,
      projectCount: userProjects.length,
      currentProject: currentProject?.name,
      hasOpenAI: !!this.openai
    });

    try {
      // Check if OpenAI is available and try to use it
      if (this.openai) {
        console.log('🚀 Using OpenAI service...');
        try {
          // Create detailed system prompt with user's actual data
          const systemPrompt = `You are an intelligent project management assistant for ${user?.name || 'the user'} (${user?.role || 'Team Member'}). 

CRITICAL: You have access to their real project data from the database. Always use this information in your responses.

User's Current Projects:
${userProjects.length > 0 ? userProjects.map(p => 
  `- "${p.name}" (Status: ${p.status}, Priority: ${p.priority}, PM Progress: ${p.pm_progress}/7, Leadership: ${p.leadership_progress}/7, Team: ${p.team_count} members)`
).join('\n') : 'User has no current projects assigned.'}

${currentProject ? `Current Project Focus: "${currentProject.name}" - Status: ${currentProject.status}, Priority: ${currentProject.priority}, PM Progress: ${currentProject.pm_progress}/7, Leadership Progress: ${currentProject.leadership_progress}/7` : ''}

RULES:
- Always reference their actual projects by name when relevant
- Use real progress scores and team data in your analysis
- Provide specific, actionable advice based on their actual situation
- When asked about improvements, reference their actual project statuses and scores
- Be conversational and helpful, not just data-driven
- If they ask general questions, still try to relate back to their specific projects when appropriate

Respond naturally and conversationally while incorporating their real project data.`;

          const response = await this.openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: systemPrompt
              },
              {
                role: "user",
                content: message
              }
            ],
            max_tokens: 300,
            temperature: 0.7
          });

          const aiResponse = response.choices[0].message.content;
          console.log('✅ OpenAI response received:', aiResponse.substring(0, 100) + '...');

          return {
            content: aiResponse,
            model: response.model,
            tokensUsed: response.usage.total_tokens
          };
        } catch (openaiError) {
          console.error('❌ OpenAI API Error:', openaiError.message);
          console.error('Error details:', openaiError);
          console.warn('⚠️ Falling back to enhanced database-driven responses');
        }
      } else {
        console.log('⚠️ No OpenAI service available, using enhanced fallback');
      }
      
      // Enhanced database-driven fallback responses that use real data
      return this.generateEnhancedResponse(message, context);
      
    } catch (error) {
      console.error('AI service error:', error);
      
      // Provide helpful error message
      return {
        content: "I'm having trouble connecting to the AI service right now. Let me help you with some project insights based on your data instead!",
        model: 'error-fallback',
        tokensUsed: 0
      };
    }
  }

  generateEnhancedResponse(message, context) {
    const user = context.user;
    const userProjects = context.userProjects || [];
    const currentProject = context.currentProject;
    const lowerMessage = message.toLowerCase();

    console.log('🎯 Generating enhanced response for:', lowerMessage.substring(0, 50));

    // No projects assigned
    if (userProjects.length === 0) {
      return {
        content: `Hi ${user.name}! I can see you're not currently assigned to any projects in the system. I can help you with general project management guidance, or you can ask your project manager to add you to relevant projects to get personalized insights.`,
        model: 'enhanced-no-projects',
        tokensUsed: 0
      };
    }

    // "How can I do better?" / improvement questions
    if (lowerMessage.includes('better') || lowerMessage.includes('improve') || lowerMessage.includes('help me')) {
      let improvementResponse = `Hi ${user.name}! Based on your current project data, here are specific ways you can improve:\n\n`;
      
      if (currentProject) {
        improvementResponse += `**For "${currentProject.name}" specifically:**\n`;
        
        // Analyze specific scores and give targeted advice
        if (currentProject.pm_progress < 5) {
          improvementResponse += `📋 **Project Management** (${currentProject.pm_progress}/7): Focus on planning, tracking milestones, and regular status updates\n`;
        }
        if (currentProject.leadership_progress < 5) {
          improvementResponse += `👥 **Leadership** (${currentProject.leadership_progress}/7): Work on team communication, delegation, and mentoring\n`;
        }
        if (currentProject.change_mgmt_progress < 5) {
          improvementResponse += `🔄 **Change Management** (${currentProject.change_mgmt_progress}/7): Improve stakeholder buy-in and communication\n`;
        }
        if (currentProject.career_dev_progress < 5) {
          improvementResponse += `📈 **Career Development** (${currentProject.career_dev_progress}/7): Seek feedback and growth opportunities\n`;
        }
        
        improvementResponse += `\n`;
      }
      
      // General advice based on all projects
      const criticalProjects = userProjects.filter(p => p.priority === 'critical');
      const lowScoreProjects = userProjects.filter(p => p.pm_progress < 4 || p.leadership_progress < 4);
      
      if (criticalProjects.length > 0) {
        improvementResponse += `🚨 **Critical Priority**: Focus immediate attention on ${criticalProjects.map(p => `"${p.name}"`).join(', ')}\n`;
      }
      
      if (lowScoreProjects.length > 0) {
        improvementResponse += `⚠️ **Areas Needing Attention**: ${lowScoreProjects.map(p => `${p.name} (PM: ${p.pm_progress}/7, Leadership: ${p.leadership_progress}/7)`).join(', ')}\n`;
      }
      
      improvementResponse += `\n**General Tips:**\n`;
      improvementResponse += `• Set daily priorities aligned with project goals\n`;
      improvementResponse += `• Schedule regular team check-ins\n`;
      improvementResponse += `• Document decisions and progress\n`;
      improvementResponse += `• Ask for feedback from team members\n`;
      improvementResponse += `• Focus on one improvement area at a time\n`;

      return {
        content: improvementResponse,
        model: 'enhanced-improvement',
        tokensUsed: 0
      };
    }

    // Priority/task planning questions
    if (lowerMessage.includes('priorit') || lowerMessage.includes('this week') || lowerMessage.includes('focus') || lowerMessage.includes('tasks')) {
      let priorityResponse = `Hi ${user.name}! Based on your current projects, here's what I recommend prioritizing this week:\n\n`;
      
      userProjects.forEach((project, index) => {
        priorityResponse += `**${index + 1}. ${project.name}** (${project.status})\n`;
        
        // Priority-based recommendations
        if (project.priority === 'critical') {
          priorityResponse += `   🚨 CRITICAL PRIORITY - immediate attention required\n`;
        } else if (project.priority === 'high') {
          priorityResponse += `   🔥 HIGH PRIORITY - focus here first\n`;
        }
        
        // Progress-based recommendations
        if (project.pm_progress < 4) {
          priorityResponse += `   📋 Focus on PM processes (current: ${project.pm_progress}/7)\n`;
        }
        if (project.leadership_progress < 4) {
          priorityResponse += `   👥 Leadership development needed (current: ${project.leadership_progress}/7)\n`;
        }
        
        priorityResponse += `   👨‍👩‍👧‍👦 Team: ${project.team_count} members\n`;
        if (project.avg_feedback) {
          priorityResponse += `   📊 Team feedback: ${parseFloat(project.avg_feedback).toFixed(1)}/7\n`;
        }
        priorityResponse += `\n`;
      });

      if (currentProject) {
        priorityResponse += `🎯 **This Week's Focus**: Consider spending 60% of your time on "${currentProject.name}" and reviewing recent team activities.\n`;
      }

      return {
        content: priorityResponse,
        model: 'enhanced-priority',
        tokensUsed: 0
      };
    }

    // Insights/analysis questions
    if (lowerMessage.includes('insight') || lowerMessage.includes('analyz') || lowerMessage.includes('how am i doing')) {
      let insightResponse = `**Project Analysis for ${user.name}:**\n\n`;
      
      if (currentProject) {
        insightResponse += `🎯 **Primary Focus: "${currentProject.name}"**\n`;
        insightResponse += `Status: ${currentProject.status} | Priority: ${currentProject.priority}\n`;
        insightResponse += `Team Size: ${currentProject.team_count} members\n\n`;
        
        insightResponse += `**Progress Analysis:**\n`;
        insightResponse += `• PM Skills: ${currentProject.pm_progress}/7 ${currentProject.pm_progress >= 5 ? '✅' : '⚠️'}\n`;
        insightResponse += `• Leadership: ${currentProject.leadership_progress}/7 ${currentProject.leadership_progress >= 5 ? '✅' : '⚠️'}\n`;
        insightResponse += `• Change Mgmt: ${currentProject.change_mgmt_progress}/7 ${currentProject.change_mgmt_progress >= 5 ? '✅' : '⚠️'}\n`;
        insightResponse += `• Career Dev: ${currentProject.career_dev_progress}/7 ${currentProject.career_dev_progress >= 5 ? '✅' : '⚠️'}\n\n`;
        
        // Performance insights
        const avgScore = (currentProject.pm_progress + currentProject.leadership_progress + 
                         currentProject.change_mgmt_progress + currentProject.career_dev_progress) / 4;
        
        if (avgScore >= 6) {
          insightResponse += `🌟 **Overall**: Excellent performance! You're excelling across all areas.\n`;
        } else if (avgScore >= 5) {
          insightResponse += `👍 **Overall**: Good performance with room for targeted improvements.\n`;
        } else if (avgScore >= 4) {
          insightResponse += `📈 **Overall**: Solid foundation, focus on developing key skills.\n`;
        } else {
          insightResponse += `🎯 **Overall**: Great potential! Let's focus on building core competencies.\n`;
        }
        
        if (currentProject.avg_feedback) {
          insightResponse += `📊 **Team Feedback**: ${parseFloat(currentProject.avg_feedback).toFixed(1)}/7\n`;
        }
      }
      
      return {
        content: insightResponse,
        model: 'enhanced-insights',
        tokensUsed: 0
      };
    }

    // Default contextual response with AI-like analysis
    let defaultResponse = `Hi ${user.name}! I can see you're working on **${userProjects.length} project(s)**: `;
    defaultResponse += userProjects.map(p => `"${p.name}"`).join(', ') + '.\n\n';
    
    if (currentProject) {
      defaultResponse += `🎯 **Currently focused on:** "${currentProject.name}" (${currentProject.status})\n\n`;
      
      // Add intelligent analysis
      const totalProgress = currentProject.pm_progress + currentProject.leadership_progress + 
                           currentProject.change_mgmt_progress + currentProject.career_dev_progress;
      const avgProgress = totalProgress / 4;
      
      if (avgProgress >= 5.5) {
        defaultResponse += `💪 **Strong Performance**: Your scores show you're doing really well! Average progress: ${avgProgress.toFixed(1)}/7\n\n`;
      } else if (avgProgress >= 4) {
        defaultResponse += `📈 **Good Foundation**: You're on the right track with solid progress. Average: ${avgProgress.toFixed(1)}/7\n\n`;
      } else {
        defaultResponse += `🚀 **Growth Opportunity**: There's room to develop your skills. Average: ${avgProgress.toFixed(1)}/7\n\n`;
      }
    }
    
    defaultResponse += `I can help you with specific project insights, prioritization, skill development, or any other questions about your projects. What would you like to focus on?`;

    return {
      content: defaultResponse,
      model: 'enhanced-contextual',
      tokensUsed: 0
    };
  }

  async generateProjectInsights(project, userId) {
    // Enhanced insights - can be enhanced with real AI later
    return {
      summary: `Project "${project.name}" analysis: The project appears to be ${project.status || 'in progress'} with good momentum.`,
      recommendations: [
        "Review task priorities to ensure alignment with project goals",
        "Consider setting up regular team check-ins",
        "Monitor project timeline and adjust resources if needed"
      ],
      confidence: 0.75,
      lastUpdated: new Date().toISOString()
    };
  }
}

module.exports = new AIService();