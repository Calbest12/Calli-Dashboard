import React, { useState, useRef, useEffect } from 'react';
import './Chatbot.css';
import apiService from '../services/apiService';

const Chatbot = ({ currentUser = null, currentProject = null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize welcome message when user changes
  useEffect(() => {
    if (currentUser) {
      setMessages([{
        id: 1,
        sender: 'ai', 
        text: `Hi ${currentUser.name}! I'm your AI assistant. I can help you with project management, provide insights, and answer questions about your projects. ${currentProject ? `I can see you're working on "${currentProject.name}".` : ''}`,
        timestamp: new Date(),
        model: 'assistant'
      }]);
    } else {
      setMessages([]);
    }
  }, [currentUser, currentProject]);

  const toggleChat = () => {
    if (!currentUser) {
      // Don't open chat if not logged in
      return;
    }
    setIsOpen(!isOpen);
    setError(null);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !currentUser) return;
  
    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: input.trim(),
      timestamp: new Date()
    };
  
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setError(null);
  
    try {
      const messageText = userMessage.text.toLowerCase();
      
      // Check if this is asking about all projects
      const isAllProjectsRequest = (
        messageText.includes('current projects') ||
        messageText.includes('all projects') ||
        messageText.includes('my projects') ||
        (messageText.includes('projects') && messageText.includes('summary'))
      );
      
      // Check if this is a specific project insight request
      const isProjectInsightRequest = currentProject && (
        messageText.includes('analyze') ||
        messageText.includes('insight') ||
        messageText.includes('summary') ||
        messageText.includes('progress') ||
        messageText.includes('status') ||
        messageText.includes('how is') ||
        messageText.includes('what about') ||
        (messageText.includes('project') && (messageText.includes('doing') || messageText.includes('going')))
      );

      let response;
      
      if (isAllProjectsRequest) {
        // Get all projects for the user
        console.log('📊 Fetching all projects for user');
        try {
          const projectsResponse = await apiService.getAllProjects();
          if (projectsResponse.success && projectsResponse.data) {
            const projects = projectsResponse.data;
            let projectSummary = `You currently have ${projects.length} project(s):\n\n`;
            
            projects.forEach(project => {
              projectSummary += `📁 **${project.name}**\n`;
              projectSummary += `   Status: ${project.status || 'Unknown'}\n`;
              projectSummary += `   Priority: ${project.priority || 'Unknown'}\n`;
              if (project.deadline) {
                projectSummary += `   Deadline: ${new Date(project.deadline).toLocaleDateString()}\n`;
              }
              projectSummary += `   PM Progress: ${project.pm_progress || 0}/7\n`;
              projectSummary += `   Leadership Progress: ${project.leadership_progress || 0}/7\n\n`;
            });
            
            projectSummary += "Select a specific project to get detailed insights and analysis!";
            
            const aiMessage = {
              id: Date.now() + 1,
              sender: 'ai',
              text: projectSummary,
              timestamp: new Date(),
              model: 'database-projects',
              tokensUsed: 0
            };
            setMessages([...newMessages, aiMessage]);
          } else {
            throw new Error('Failed to fetch projects');
          }
        } catch (error) {
          throw new Error('Could not fetch your projects: ' + error.message);
        }
      } else if (isProjectInsightRequest) {
        // Use the project insights endpoint for better data
        console.log('🧠 Using project insights endpoint for:', currentProject.name);
        response = await apiService.getProjectInsights(currentProject.id);
        
        if (response.success) {
          const insights = response.insights;
          let insightText = `## 📊 Insights for "${currentProject.name}"\n\n`;
          insightText += `**Summary:** ${insights.summary}\n\n`;
          insightText += `**📈 Project Metrics:**\n`;
          insightText += `• Status: ${insights.metrics.status}\n`;
          insightText += `• Priority: ${insights.metrics.priority}\n`;
          insightText += `• Team Size: ${insights.metrics.teamSize} members\n`;
          insightText += `• PM Progress: ${insights.metrics.progressScores.pm}/7\n`;
          insightText += `• Leadership Progress: ${insights.metrics.progressScores.leadership}/7\n`;
          insightText += `• Change Management: ${insights.metrics.progressScores.changeManagement}/7\n`;
          insightText += `• Career Development: ${insights.metrics.progressScores.careerDev}/7\n\n`;
          
          if (insights.metrics.avgFeedback) {
            insightText += `• Average Feedback Score: ${insights.metrics.avgFeedback}/7\n\n`;
          }
          
          insightText += `**💡 Recommendations:**\n`;
          insightText += insights.recommendations.map(rec => `• ${rec}`).join('\n');
          
          if (insights.recentActivity && insights.recentActivity.length > 0) {
            insightText += `\n\n**📋 Recent Activity:**\n`;
            insights.recentActivity.slice(0, 3).forEach(activity => {
              const date = new Date(activity.created_at).toLocaleDateString();
              insightText += `• ${activity.description} (${date})\n`;
            });
          }
          
          const aiMessage = {
            id: Date.now() + 1,
            sender: 'ai',
            text: insightText,
            timestamp: new Date(),
            model: 'database-insights',
            tokensUsed: 0
          };
          setMessages([...newMessages, aiMessage]);
        } else {
          throw new Error('Failed to get project insights');
        }
      } else {
        // Use regular chat endpoint with enhanced context
        const enhancedContext = {
          user: {
            name: currentUser.name,
            role: currentUser.role,
            id: currentUser.id
          },
          project: currentProject ? {
            id: currentProject.id,
            name: currentProject.name,
            status: currentProject.status,
            progress: currentProject.progress
          } : null,
          hasCurrentProject: !!currentProject
        };
        
        response = await apiService.sendAIChat({
          message: userMessage.text,
          context: enhancedContext,
          projectId: currentProject?.id || null
        });
    
        if (response.success) {
          const aiMessage = {
            id: Date.now() + 1,
            sender: 'ai',
            text: response.response,
            timestamp: new Date(),
            model: response.model || 'ai-assistant',
            tokensUsed: response.tokensUsed
          };
          setMessages([...newMessages, aiMessage]);
        } else {
          throw new Error(response.error || 'Failed to get AI response');
        }
      }
  
    } catch (error) {
      console.error('AI Chat Error:', error);
      setError(error.message);
  
      // Provide a helpful fallback response
      let fallbackText = 'I apologize, but I\'m having trouble right now. ';
      
      if (error.message.includes('401') || error.message.includes('auth')) {
        fallbackText += 'It seems there\'s an authentication issue. Please try logging out and back in.';
      } else if (error.message.includes('404')) {
        fallbackText += 'The AI service isn\'t available yet. The backend AI routes may need to be set up.';
      } else if (error.message.includes('Please log in')) {
        fallbackText += 'Please make sure you\'re logged in to use AI features.';
      } else {
        fallbackText += `Error: ${error.message}`;
      }
  
      const errorMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        text: fallbackText,
        timestamp: new Date(),
        isError: true
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    if (!currentUser) return;
    
    setMessages([{
      id: 1,
      sender: 'ai',
      text: `Chat cleared! How else can I help you with your projects, ${currentUser.name}?`,
      timestamp: new Date()
    }]);
    setError(null);
  };

  const formatTimestamp = (timestamp) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(timestamp);
  };

  // Suggest quick actions based on context
  const getQuickActions = () => {
    if (!currentUser) return [];
    
    const actions = [
      'How can I improve my project management?',
      'What should I prioritize this week?',
      'Give me a summary of my current projects'
    ];

    if (currentProject) {
      actions.unshift(`Analyze the "${currentProject.name}" project`);
      actions.push(`What are the risks for "${currentProject.name}"?`);
    }

    return actions.slice(0, 3); // Show max 3 quick actions
  };

  const quickActions = getQuickActions();

  // Don't render anything if user is not logged in
  if (!currentUser) {
    return null;
  }

  return (
    <div className="chatbot-container">
      <button 
        className={`chat-toggle ${isOpen ? 'open' : ''}`} 
        onClick={toggleChat}
        title="AI Assistant"
      >
        {isLoading ? '⏳' : '🤖'}
      </button>
      
      {isOpen && (
        <div className="chatbox">
          {/* Chat Header */}
          <div className="chat-header">
            <div className="chat-title">
              <span className="ai-icon">🤖</span>
              <span>AI Assistant</span>
              {currentProject && (
                <span className="project-context">
                  {currentProject.name}
                </span>
              )}
            </div>
            <div className="chat-actions">
              <button 
                onClick={clearChat}
                className="clear-button"
                title="Clear chat"
              >
                🗑️
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="close-button"
                title="Close chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="chat-error">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{error}</span>
              <button 
                onClick={() => setError(null)}
                className="error-dismiss"
              >
                ✕
              </button>
            </div>
          )}

          {/* Messages Area */}
          <div className="chat-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-message ${msg.sender} ${msg.isError ? 'error' : ''}`}>
                <div className="message-content">
                  <div className="message-text">{msg.text}</div>
                  <div className="message-meta">
                    <span className="message-time">
                      {formatTimestamp(msg.timestamp)}
                    </span>
                    {msg.model && msg.model !== 'assistant' && (
                      <span className="message-model">{msg.model}</span>
                    )}
                    {msg.tokensUsed && (
                      <span className="message-tokens">{msg.tokensUsed} tokens</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="chat-message ai">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {quickActions.length > 0 && messages.length <= 2 && (
            <div className="quick-actions">
              <div className="quick-actions-title">Quick suggestions:</div>
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  className="quick-action-button"
                  onClick={() => {
                    setInput(action);
                    // Auto-send after a brief delay to show the action
                    setTimeout(() => {
                      if (input === action) sendMessage();
                    }, 100);
                  }}
                  disabled={isLoading}
                >
                  {action}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="chat-input">
            <div className="input-wrapper">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about your projects..."
                disabled={isLoading}
              />
              <button 
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="send-button"
              >
                {isLoading ? '⏳' : '➤'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;