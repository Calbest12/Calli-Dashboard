const axios = require('axios');

class AIService {
  constructor() {
    console.log('🔍 Raw process.env.OPENAI_API_KEY:', process.env.OPENAI_API_KEY);
    console.log('🔍 Type:', typeof process.env.OPENAI_API_KEY);
  
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.documentsLoaded = false;
    
    console.log('🤖 AI Service initializing...');
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

  async processChat(message, context = {}) {
    try {
      let relevantDocs = [];
      let documentLoader;
      
      try {
        documentLoader = require('../documentLoader');
        relevantDocs = documentLoader.searchDocuments(message, 3);
      } catch (error) {
        console.warn('⚠️ Document loader not available:', error.message);
        relevantDocs = [];
      }

      let enhancedMessage = message;
      
      if (relevantDocs.length > 0) {
        const documentContext = relevantDocs.map(doc => doc.content).join('\n\n');
        
        enhancedMessage = `You are a senior project management consultant. Use your expertise and the following knowledge base to provide practical, actionable advice. Do NOT mention the knowledge base, training materials, or document sources in your response.

Knowledge Base Context:
${documentContext}

User Context: ${context.user?.name || 'User'} is a ${context.user?.role || 'professional'} asking about project management.

User Question: ${message}

Instructions:
- Provide practical, professional advice
- Use specific metrics and data when relevant
- Focus on actionable recommendations
- Keep responses concise and user-friendly
- Do not mention training materials, documents, or knowledge base
- Speak as an experienced consultant would
- If using information from the knowledge base, present it as your professional expertise`;
      }

      if (this.openaiApiKey) {
        console.log('🚀 Using OpenAI GPT-4 for response generation');
        const response = await this.callOpenAI(enhancedMessage, context);
        
        const cleanedResponse = this.cleanResponse(response);
        
        return {
          content: cleanedResponse,
          model: 'gpt-3.5-turbo',
          tokensUsed: this.estimateTokens(enhancedMessage + response),
          documentsUsed: relevantDocs.length,
          documentSources: [] 
        };
      } else {
        console.log('🔧 Using professional fallback responses');
        return this.getProfessionalFallbackResponse(message, context);
      }
      
    } catch (error) {
      console.error('❌ AI processing error:', error);
      throw new Error(`I apologize, but I'm experiencing some technical difficulties. Please try your question again.`);
    }
  }

  async callOpenAI(message, context) {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not available');
    }
  
    try {
      console.log('📡 Calling OpenAI API...');
      
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
                role: 'system',
                content: `You are a senior project management consultant with deep expertise in project delivery, team leadership, and organizational development. You provide practical, actionable advice to professionals.
              
              Key Guidelines:
              - Always respond as a knowledgeable consultant
              - Provide specific, actionable recommendations
              - Use professional, friendly language
              - Include relevant metrics when helpful
              - Focus on practical solutions
              - Structure your responses with clear sections when appropriate
              - Use bullet points for lists of recommendations
              - Use **bold text** for key points
              - Use ## headers for main sections when providing detailed analysis
              - Keep responses well-organized and easy to scan
              - Do not mention training materials, documents, knowledge bases, or technical implementation details
              - Present all information as your professional expertise`
              },
            {
              role: 'user',
              content: message
            }
          ],
          max_tokens: 800, 
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
      .replace(/\b(training materials?|knowledge base|document loader|document sources?)\b/gi, 'my expertise')
      .replace(/\b(based on the (training|provided) materials?)\b/gi, 'based on my experience')
      .replace(/\bthe (training|provided) materials? (provide|show|indicate)\b/gi, 'my experience shows')
      
      .replace(/\b\w+\.(js|jsx|ts|tsx|json|md|txt|csv|pdf)\b/gi, '')
      
      .replace(/\b(API|endpoint|service|controller|database|query)\b/gi, '')
      .replace(/\/api\/[a-zA-Z\/\-_]+/gi, '')
      
      .replace(/\b(function|method|console\.log|error|response|request)\b/gi, '')
      
      .replace(/\b(this relates to [a-zA-Z_]+)\b/gi, 'this is related to project management')
      .replace(/\b([a-zA-Z_]+ category)\b/gi, 'project management')
      
      .replace(/\bto get AI-powered analysis\b/gi, 'for enhanced insights')
      .replace(/\bAdd (your )?OpenAI API key\b/gi, 'Enable advanced features')
      
      .replace(/\s+/g, ' ')
      .replace(/\s*[,;]\s*[,;]/g, ',')
      .trim();

    if (cleaned.length < 30) {
      return 'Thank you for your question. I\'d be happy to help you with project management guidance. Could you provide more specific details about what you\'d like assistance with?';
    }

    return cleaned;
  }

  getProfessionalFallbackResponse(message, context) {
    const user = context?.user || { name: 'there' };
    const userName = user.name === 'there' ? 'there' : user.name;
    
    let response = `Hello ${userName}! `;

    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('project') && lowerMessage.includes('progress')) {
      response += `For project progress tracking, I recommend implementing weekly status reviews with clear metrics. Focus on key milestones, identify blockers early, and maintain transparent communication with stakeholders. Consider using a simple progress dashboard to visualize completion rates and timeline adherence.`;
    } else if (lowerMessage.includes('team') || lowerMessage.includes('member')) {
      response += `Effective team management requires clear role definitions, regular check-ins, and open communication channels. Establish team norms, provide constructive feedback, and recognize achievements. Consider implementing daily standups or weekly team meetings to maintain alignment and address challenges promptly.`;
    } else if (lowerMessage.includes('deadline') || lowerMessage.includes('timeline')) {
      response += `For deadline management, break down projects into smaller milestones with buffer time. Use backward planning from your end date, identify critical path activities, and monitor progress weekly. Communicate timeline risks early and have contingency plans ready.`;
    } else if (lowerMessage.includes('risk') || lowerMessage.includes('issue')) {
      response += `Risk management is crucial for project success. Create a risk register, assess probability and impact, and develop mitigation strategies. Hold regular risk review sessions, escalate high-priority risks promptly, and maintain a lessons learned database for future projects.`;
    } else if (lowerMessage.includes('communication')) {
      response += `Strong communication is the foundation of successful projects. Establish clear communication protocols, use appropriate channels for different message types, and ensure regular stakeholder updates. Consider implementing a communication matrix to clarify who needs what information and when.`;
    } else {
      response += `I can help you with project management guidance across areas like planning, execution, team leadership, risk management, and stakeholder communication. What specific aspect of your project would you like to focus on?`;
    }

    return {
      content: response,
      model: 'professional-consultant',
      tokensUsed: 0,
      documentsUsed: 0,
      documentSources: []
    };
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
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new AIService();