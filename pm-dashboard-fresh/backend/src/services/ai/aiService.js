const axios = require('axios');
const { Pool } = require('pg');

class AIService {
  constructor() {
    console.log('🔍 Raw process.env.OPENAI_API_KEY:', process.env.OPENAI_API_KEY);
    console.log('🔍 Type:', typeof process.env.OPENAI_API_KEY);
  
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.documentsLoaded = false;
    this.dbPool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'project_manager',
      password: process.env.DB_PASSWORD || 'postgres',
      port: process.env.DB_PORT || 5432,
    });
    
    console.log('🤖 Enhanced AI Service initializing...');
    console.log('🔑 OpenAI API Key present:', !!this.openaiApiKey);
    console.log('🔑 API Key valid format:', this.openaiApiKey?.startsWith('sk-') || false);
    
    if (!this.openaiApiKey) {
      console.warn('⚠️ No OpenAI API key found - AI will use fallback mode');
      console.log('💡 Add OPENAI_API_KEY to your .env file to enable full AI capabilities');
    } else if (!this.openaiApiKey.startsWith('sk-')) {
      console.error('❌ Invalid OpenAI API key format - should start with sk-');
      this.openaiApiKey = null;
    } else {
      console.log('✅ OpenAI API key loaded successfully');
    }
    
    this.initializeDocuments().catch(error => {
      console.warn('⚠️ Document initialization failed:', error.message);
    });
  }

  async initializeDocuments() {
    try {
      console.log('🚀 Initializing AI service with training documents...');
      const documentLoader = require('../documentLoader');
      await documentLoader.loadAllDocuments();
      this.documentsLoaded = true;
      
      const stats = documentLoader.getStats();
      console.log('📊 Training documents loaded:', stats);
      
    } catch (error) {
      console.error('❌ Failed to load training documents:', error.message);
      this.documentsLoaded = false;
    }
  }

  async searchDatabaseKnowledge(query, userId = null, projectId = null) {
    try {
      const searchResults = {
        projects: [],
        users: [],
        assessments: [],
        goals: [],
        interactions: []
      };

      // Search projects
      const projectQuery = `
        SELECT p.*, u.name as creator_name, u.role as creator_role
        FROM projects p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.name ILIKE $1 OR p.description ILIKE $1
        ${projectId ? 'OR p.id = $2' : ''}
        ORDER BY p.updated_at DESC
        LIMIT 10
      `;
      const projectParams = [`%${query}%`];
      if (projectId) projectParams.push(projectId);
      
      const projectResults = await this.dbPool.query(projectQuery, projectParams);
      searchResults.projects = projectResults.rows;

      // Search users and team information
      if (userId) {
        const userQuery = `
          SELECT u.*, COUNT(p.id) as project_count
          FROM users u
          LEFT JOIN projects p ON u.id = p.user_id
          WHERE u.name ILIKE $1 OR u.email ILIKE $1 OR u.role ILIKE $1
          GROUP BY u.id
          LIMIT 5
        `;
        const userResults = await this.dbPool.query(userQuery, [`%${query}%`]);
        searchResults.users = userResults.rows;
      }

      // Search assessment data for leadership insights
      const assessmentQuery = `
        SELECT 'leadership_diamond' as type, ld.*, u.name, u.role
        FROM leadership_diamond_assessments ld
        JOIN users u ON ld.user_id = u.id
        ${userId ? 'WHERE ld.user_id = $1' : ''}
        UNION ALL
        SELECT 'value' as type, va.*, u.name, u.role
        FROM value_assessments va
        JOIN users u ON va.user_id = u.id
        ${userId ? 'WHERE va.user_id = $1' : ''}
        ORDER BY created_at DESC
        LIMIT 10
      `;
      const assessmentParams = userId ? [userId] : [];
      const assessmentResults = await this.dbPool.query(assessmentQuery, assessmentParams);
      searchResults.assessments = assessmentResults.rows;

      // Search career development goals
      const goalQuery = `
        SELECT cg.*, u.name, u.role
        FROM career_development_goals cg
        JOIN users u ON cg.user_id = u.id
        WHERE cg.description ILIKE $1 OR cg.notes ILIKE $1
        ${userId ? 'OR cg.user_id = $2' : ''}
        ORDER BY cg.updated_at DESC
        LIMIT 10
      `;
      const goalParams = [`%${query}%`];
      if (userId) goalParams.push(userId);
      const goalResults = await this.dbPool.query(goalQuery, goalParams);
      searchResults.goals = goalResults.rows;

      // Search previous AI interactions for context
      const interactionQuery = `
        SELECT ai.query, ai.response, ai.context_data, ai.created_at, u.name, u.role
        FROM ai_interactions ai
        JOIN users u ON ai.user_id = u.id
        WHERE ai.query ILIKE $1 OR ai.response ILIKE $1
        ${userId ? 'AND ai.user_id = $2' : ''}
        ORDER BY ai.created_at DESC
        LIMIT 5
      `;
      const interactionParams = [`%${query}%`];
      if (userId) interactionParams.push(userId);
      const interactionResults = await this.dbPool.query(interactionQuery, interactionParams);
      searchResults.interactions = interactionResults.rows;

      return searchResults;
    } catch (error) {
      console.error('❌ Database search error:', error.message);
      return {
        projects: [],
        users: [],
        assessments: [],
        goals: [],
        interactions: []
      };
    }
  }

  async searchTrainingDocuments(query, limit = 5) {
    try {
      let relevantDocs = [];
      let documentLoader;
      
      try {
        documentLoader = require('../documentLoader');
        relevantDocs = documentLoader.searchDocuments(query, limit);
      } catch (error) {
        console.warn('⚠️ Document loader not available:', error.message);
        
        // Fallback: Search database stored training documents
        const docQuery = `
          SELECT td.filename, td.content, td.metadata, dc.content as chunk_content
          FROM training_documents td
          LEFT JOIN document_chunks dc ON td.id = dc.document_id
          WHERE td.content ILIKE $1 OR dc.content ILIKE $1
          ORDER BY td.updated_at DESC
          LIMIT $2
        `;
        const docResults = await this.dbPool.query(docQuery, [`%${query}%`, limit]);
        relevantDocs = docResults.rows.map(row => ({
          source: row.filename,
          content: row.chunk_content || row.content,
          metadata: row.metadata || {},
          score: 1
        }));
      }

      return relevantDocs;
    } catch (error) {
      console.error('❌ Document search error:', error.message);
      return [];
    }
  }

  buildComprehensiveContext(query, databaseResults, documentResults, userContext = {}) {
    const contextParts = [];

    // Add user context
    if (userContext.user) {
      contextParts.push(`User Context: ${userContext.user.name} (${userContext.user.role}) is asking about: ${query}`);
    }

    // Add project context
    if (databaseResults.projects.length > 0) {
      const projectInfo = databaseResults.projects.map(p => 
        `Project "${p.name}": ${p.description} (Status: ${p.status}, Created by: ${p.creator_name})`
      ).join('\n');
      contextParts.push(`Relevant Projects:\n${projectInfo}`);
    }

    // Add assessment insights
    if (databaseResults.assessments.length > 0) {
      const assessmentInfo = databaseResults.assessments.map(a => {
        if (a.type === 'leadership_diamond') {
          return `Leadership Assessment for ${a.name}: Task(${a.task_score}/10), Team(${a.team_score}/10), Individual(${a.individual_score}/10), Organization(${a.organization_score}/10)`;
        } else if (a.type === 'value') {
          return `Value Assessment for ${a.name}: Vision(${a.vision_score}/10), Alignment(${a.alignment_score}/10), Understanding(${a.understanding_score}/10), Enactment(${a.enactment_score}/10)`;
        }
        return `Assessment for ${a.name}`;
      }).join('\n');
      contextParts.push(`Assessment Data:\n${assessmentInfo}`);
    }

    // Add career development context
    if (databaseResults.goals.length > 0) {
      const goalInfo = databaseResults.goals.map(g => 
        `Goal: ${g.description} (Progress: ${g.progress}%, Priority: ${g.priority}, Status: ${g.status})`
      ).join('\n');
      contextParts.push(`Career Development Goals:\n${goalInfo}`);
    }

    // Add team insights
    if (databaseResults.users.length > 0) {
      const teamInfo = databaseResults.users.map(u => 
        `Team Member: ${u.name} (${u.role}) - ${u.project_count} projects`
      ).join('\n');
      contextParts.push(`Team Information:\n${teamInfo}`);
    }

    // Add document knowledge
    if (documentResults.length > 0) {
      const docInfo = documentResults.map(doc => 
        `Knowledge: ${doc.content.substring(0, 200)}...`
      ).join('\n');
      contextParts.push(`Professional Knowledge Base:\n${docInfo}`);
    }

    // Add conversation history for continuity
    if (databaseResults.interactions.length > 0) {
      const historyInfo = databaseResults.interactions.slice(0, 2).map(i => 
        `Previous Context: Q: "${i.query.substring(0, 100)}" A: "${i.response.substring(0, 100)}..."`
      ).join('\n');
      contextParts.push(`Recent Conversation Context:\n${historyInfo}`);
    }

    return contextParts.join('\n\n');
  }

  async processChat(message, context = {}) {
    try {
      console.log('🔍 Starting comprehensive knowledge search...');
      
      const userId = context.user?.id;
      const projectId = context.projectId;

      // Search all available data sources
      const [databaseResults, documentResults] = await Promise.all([
        this.searchDatabaseKnowledge(message, userId, projectId),
        this.searchTrainingDocuments(message, 5)
      ]);

      // Build comprehensive context from all sources
      const comprehensiveContext = this.buildComprehensiveContext(
        message, 
        databaseResults, 
        documentResults, 
        context
      );

      console.log(`📊 Knowledge gathered: ${databaseResults.projects.length} projects, ${databaseResults.assessments.length} assessments, ${documentResults.length} documents`);

      let enhancedMessage = message;
      
      if (comprehensiveContext.trim().length > 0) {
        enhancedMessage = `You are a senior project management consultant with access to comprehensive organizational data. Use all available context to provide the most relevant, personalized advice. Do NOT mention data sources, databases, or technical systems in your response.

COMPREHENSIVE CONTEXT:
${comprehensiveContext}

USER QUESTION: ${message}

INSTRUCTIONS:
- Provide specific, actionable advice based on all available context
- Reference relevant projects, assessments, and team dynamics when helpful
- Use concrete data points and metrics from the context
- Maintain professional consultant tone
- Focus on practical solutions tailored to this specific situation
- Do not mention technical systems, databases, or data sources
- Present insights as your professional analysis`;
      }

      if (this.openaiApiKey) {
        console.log('🚀 Using OpenAI with comprehensive context');
        const response = await this.callOpenAI(enhancedMessage, context);
        
        const cleanedResponse = this.cleanResponse(response);
        
        // Log this interaction for future context
        await this.logInteraction(userId, projectId, message, cleanedResponse, {
          documentsUsed: documentResults.length,
          projectsReferenced: databaseResults.projects.length,
          assessmentsUsed: databaseResults.assessments.length,
          contextLength: comprehensiveContext.length
        });
        
        return {
          content: cleanedResponse,
          model: 'gpt-3.5-turbo-enhanced',
          tokensUsed: this.estimateTokens(enhancedMessage + response),
          documentsUsed: documentResults.length,
          dataSourcesUsed: {
            projects: databaseResults.projects.length,
            assessments: databaseResults.assessments.length,
            goals: databaseResults.goals.length,
            documents: documentResults.length
          }
        };
      } else {
        console.log('🔧 Using enhanced fallback with context');
        return this.getContextualFallbackResponse(message, context, databaseResults, documentResults);
      }
      
    } catch (error) {
      console.error('❌ AI processing error:', error);
      throw new Error(`I apologize, but I'm experiencing some technical difficulties. Please try your question again.`);
    }
  }

  async logInteraction(userId, projectId, query, response, metadata = {}) {
    try {
      if (!userId) return;
      
      await this.dbPool.query(
        `INSERT INTO ai_interactions (user_id, project_id, query, response, model_used, context_data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, projectId, query, response, 'enhanced-ai-service', metadata]
      );
    } catch (error) {
      console.warn('⚠️ Failed to log interaction:', error.message);
    }
  }

  getContextualFallbackResponse(message, context, databaseResults, documentResults) {
    const user = context?.user || { name: 'there' };
    const userName = user.name === 'there' ? 'there' : user.name;
    
    let response = `Hello ${userName}! `;

    // Use actual project data if available
    if (databaseResults.projects.length > 0) {
      const currentProject = databaseResults.projects[0];
      response += `I can see you're working with "${currentProject.name}". Based on the project status (${currentProject.status}), `;
    }

    // Use assessment data for personalized advice
    if (databaseResults.assessments.length > 0) {
      const assessment = databaseResults.assessments[0];
      if (assessment.type === 'leadership_diamond') {
        response += `considering your leadership profile shows strengths in areas scoring ${Math.max(assessment.task_score, assessment.team_score, assessment.individual_score, assessment.organization_score)}/10, `;
      }
    }

    // Use document knowledge if available
    if (documentResults.length > 0) {
      const docContent = documentResults[0].content.toLowerCase();
      if (docContent.includes('project management')) {
        response += `based on established project management principles, `;
      } else if (docContent.includes('leadership')) {
        response += `applying proven leadership strategies, `;
      }
    }

    // Enhanced fallback responses with context
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('project') && lowerMessage.includes('progress')) {
      response += `I recommend implementing weekly status reviews with specific KPIs. Track completion percentages, identify blockers early, and maintain stakeholder alignment through regular communication.`;
    } else if (lowerMessage.includes('team') || lowerMessage.includes('member')) {
      response += `effective team dynamics require clear role definition and regular feedback loops. Focus on establishing psychological safety, recognition systems, and collaborative decision-making processes.`;
    } else if (lowerMessage.includes('deadline') || lowerMessage.includes('timeline')) {
      response += `successful deadline management involves backward planning, critical path identification, and buffer time allocation. Monitor milestone completion rates and escalate risks proactively.`;
    } else if (lowerMessage.includes('leadership') || lowerMessage.includes('manage')) {
      response += `strong leadership combines vision communication, team empowerment, and strategic decision-making. Focus on developing emotional intelligence, active listening, and adaptive management styles.`;
    } else if (lowerMessage.includes('goal') || lowerMessage.includes('career')) {
      response += `career development requires systematic goal-setting, skill gap analysis, and continuous learning. Create specific, measurable objectives with clear timelines and accountability measures.`;
    } else {
      response += `I'd be happy to provide specific guidance tailored to your situation. Consider sharing more details about your current challenges, team dynamics, or project objectives for more targeted recommendations.`;
    }

    return {
      content: response,
      model: 'enhanced-professional-consultant',
      tokensUsed: 0,
      documentsUsed: documentResults.length,
      dataSourcesUsed: {
        projects: databaseResults.projects.length,
        assessments: databaseResults.assessments.length,
        goals: databaseResults.goals.length,
        documents: documentResults.length
      }
    };
  }

  async callOpenAI(message, context) {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not available');
    }
  
    try {
      console.log('📡 Calling OpenAI API with comprehensive context...');
      
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are a senior project management consultant with access to comprehensive organizational data including projects, team assessments, career goals, and professional knowledge. 

              Your expertise includes:
              - Project planning, execution, and monitoring
              - Team leadership and development
              - Performance assessment and improvement
              - Career development and goal setting
              - Risk management and stakeholder communication
              - Organizational development and change management

              Key Guidelines:
              - Provide specific, actionable recommendations based on available context
              - Reference relevant data points and metrics when helpful
              - Use professional, friendly language with concrete examples
              - Focus on practical solutions tailored to the specific situation
              - Structure responses clearly with bullet points for action items
              - Use **bold text** for key recommendations
              - Include relevant metrics and timelines when appropriate
              - Do not mention technical systems, databases, or data sources
              - Present all information as your professional analysis and expertise`
            },
            {
              role: 'user',
              content: message
            }
          ],
          max_tokens: 1200, 
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
  
      console.log('✅ OpenAI API response received');
      return response.data.choices[0].message.content;
      
    } catch (error) {
      console.error('❌ OpenAI API error:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new Error('Authentication failed - please check your API configuration');
      } else if (error.response?.status === 429) {
        throw new Error('I\'m currently experiencing high demand. Please try again in a moment.');
      } else if (error.response?.status === 402) {
        throw new Error('Service temporarily unavailable due to quota limits');
      } else {
        throw new Error('I\'m experiencing technical difficulties. Please try again.');
      }
    }
  }

  cleanResponse(responseText) {
    if (!responseText) return 'I apologize, but I\'m unable to provide a response at this time.';

    let cleaned = responseText
      .replace(/\b(training materials?|knowledge base|document loader|document sources?|database|data source)\b/gi, 'my expertise')
      .replace(/\b(based on the (training|provided|available) (materials?|data|context))\b/gi, 'based on my analysis')
      .replace(/\b(according to|from) the (training|provided|available) (materials?|data|context)\b/gi, 'in my experience')
      .replace(/\bthe (training|provided|available) (materials?|data|context) (provide|show|indicate)\b/gi, 'my analysis shows')
      .replace(/\b(comprehensive context|context data|organizational data|database results)\b/gi, 'available information')
      .replace(/\b\w+\.(js|jsx|ts|tsx|json|md|txt|csv|pdf)\b/gi, '')
      .replace(/\b(API|endpoint|service|controller|database|query|schema)\b/gi, '')
      .replace(/\/api\/[a-zA-Z\/\-_]+/gi, '')
      .replace(/\b(function|method|console\.log|error|response|request|query)\b/gi, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*[,;]\s*[,;]/g, ',')
      .trim();

    if (cleaned.length < 30) {
      return 'Thank you for your question. I\'d be happy to help you with project management guidance. Could you provide more specific details about what you\'d like assistance with?';
    }

    return cleaned;
  }

  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  getDocumentStats() {
    try {
      const documentLoader = require('../documentLoader');
      return documentLoader.getStats();
    } catch (error) {
      return {
        totalDocuments: 0,
        totalChunks: 0,
        categories: [],
        avgChunksPerDoc: 0
      };
    }
  }

  async reloadDocuments() {
    console.log('🔄 Reloading training documents...');
    try {
      const documentLoader = require('../documentLoader');
      await documentLoader.loadAllDocuments();
      return this.getDocumentStats();
    } catch (error) {
      console.error('❌ Failed to reload documents:', error.message);
      return this.getDocumentStats();
    }
  }

  async healthCheck() {
    return {
      status: 'healthy',
      hasOpenAIKey: !!this.openaiApiKey,
      documentsLoaded: this.documentsLoaded,
      databaseConnected: this.dbPool ? true : false,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new AIService();