// src/services/apiService.js - Enhanced with team management and career development
const API_BASE_URL = 'http://localhost:5001/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Helper method to get auth headers
  getAuthHeaders() {
    const userId = localStorage.getItem('currentUserId');
    return {
      'Content-Type': 'application/json',
      ...(userId && { 'Authorization': `Bearer ${userId}` })
    };
  }

  // Helper method to handle API responses
  async handleResponse(response) {
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  // PROJECT CRUD OPERATIONS
  async getAllProjects() {
    console.log('📡 API: Getting all projects...');
    const response = await fetch(`${this.baseURL}/projects`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  async getProject(id) {
    console.log('📡 API: Getting project:', id);
    const response = await fetch(`${this.baseURL}/projects/${id}`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  async createProject(projectData) {
    console.log('📡 API: Creating project:', projectData.name);
    const response = await fetch(`${this.baseURL}/projects`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(projectData)
    });
    return this.handleResponse(response);
  }

  async updateProject(id, projectData) {
    console.log('📡 API: Updating project:', id, projectData.name);
    const response = await fetch(`${this.baseURL}/projects/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(projectData)
    });
    return this.handleResponse(response);
  }

  async deleteProject(id) {
    console.log('📡 API: Deleting project:', id);
    const response = await fetch(`${this.baseURL}/projects/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  // PROJECT HISTORY
  async getProjectHistory(projectId) {
    console.log('📡 API: Getting project history for:', projectId);
    const response = await fetch(`${this.baseURL}/projects/${projectId}/history`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  // PROJECT COMMENTS
  async getProjectComments(projectId) {
    console.log('📡 API: Getting comments for project:', projectId);
    const response = await fetch(`${this.baseURL}/projects/${projectId}/comments`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  async addProjectComment(projectId, commentData) {
    console.log('📡 API: Adding comment to project:', projectId);
    const response = await fetch(`${this.baseURL}/projects/${projectId}/comments`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(commentData)
    });
    return this.handleResponse(response);
  }

  async updateProjectComment(projectId, commentId, commentData) {
    console.log('📡 API: Updating comment:', commentId, 'for project:', projectId);
    const response = await fetch(`${this.baseURL}/projects/${projectId}/comments/${commentId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(commentData)
    });
    return this.handleResponse(response);
  }

  async deleteProjectComment(projectId, commentId, userData = {}) {
    console.log('📡 API: Deleting comment:', commentId, 'from project:', projectId);
    const response = await fetch(`${this.baseURL}/projects/${projectId}/comments/${commentId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData)
    });
    return this.handleResponse(response);
  }

  // TEAM MANAGEMENT
  async getProjectTeam(projectId) {
    console.log('📡 API: Getting team for project:', projectId);
    const response = await fetch(`${this.baseURL}/projects/${projectId}/team`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  async addTeamMember(projectId, memberData) {
    console.log('📡 API: Adding team member to project:', projectId, memberData.name);
    const response = await fetch(`${this.baseURL}/projects/${projectId}/team`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(memberData)
    });
    return this.handleResponse(response);
  }

  async updateTeamMember(projectId, memberId, memberData) {
    console.log('📡 API: Updating team member:', memberId, 'for project:', projectId);
    const response = await fetch(`${this.baseURL}/projects/${projectId}/team/${memberId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(memberData)
    });
    return this.handleResponse(response);
  }

  async removeTeamMember(projectId, memberId) {
    console.log('📡 API: Removing team member:', memberId, 'from project:', projectId);
    const response = await fetch(`${this.baseURL}/projects/${projectId}/team/${memberId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  // PROJECT FEEDBACK
  async submitProjectFeedback(projectId, feedbackData) {
    console.log('📡 API: Submitting feedback for project:', projectId);
    const response = await fetch(`${this.baseURL}/projects/${projectId}/feedback`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(feedbackData)
    });
    return this.handleResponse(response);
  }

  async getProjectFeedback(projectId) {
    console.log('📡 API: Getting feedback for project:', projectId);
    const response = await fetch(`${this.baseURL}/projects/${projectId}/feedback`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  // USER MANAGEMENT
  async getAllUsers() {
    console.log('📡 API: Getting all users...');
    const response = await fetch(`${this.baseURL}/users`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  async getUser(userId) {
    console.log('📡 API: Getting user:', userId);
    const response = await fetch(`${this.baseURL}/users/${userId}`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  async createUser(userData) {
    console.log('📡 API: Creating user:', userData.name);
    const response = await fetch(`${this.baseURL}/users`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData)
    });
    return this.handleResponse(response);
  }

  async updateUser(userId, userData) {
    console.log('📡 API: Updating user:', userId);
    const response = await fetch(`${this.baseURL}/users/${userId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData)
    });
    return this.handleResponse(response);
  }

  async deleteUser(userId) {
    console.log('📡 API: Deleting user:', userId);
    const response = await fetch(`${this.baseURL}/users/${userId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  // AUTH OPERATIONS
  async login(credentials) {
    console.log('📡 API: Logging in user:', credentials.email);
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return this.handleResponse(response);
  }

  async register(userData) {
    console.log('📡 API: Registering user:', userData.email);
    const response = await fetch(`${this.baseURL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return this.handleResponse(response);
  }

  async logout() {
    console.log('📡 API: Logging out...');
    const response = await fetch(`${this.baseURL}/auth/logout`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  // PROGRESS UPDATE
  async updateProjectProgress(projectId, progressData) {
    console.log('📡 API: Updating project progress:', projectId);
    const response = await fetch(`${this.baseURL}/projects/${projectId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ progress: progressData })
    });
    return this.handleResponse(response);
  }

  // AI CHAT METHODS
  async sendChatMessage(message, context = {}, projectId = null) {
    console.log('📡 API: Sending chat message...');
    const response = await fetch(`${this.baseURL}/ai/chat`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        message,
        context,
        projectId
      })
    });
    return this.handleResponse(response);
  }

  // Alternative method name for compatibility
  async sendAIChat(data) {
    console.log('📡 API: Sending AI chat (alternative method)...');
    const { message, context = {}, projectId = null } = data;
    
    const response = await fetch(`${this.baseURL}/ai/chat`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        message,
        context,
        projectId
      })
    });
    return this.handleResponse(response);
  }

  // AI INSIGHTS METHODS
  async getAIInsights(projectId) {
    console.log('📊 API: Getting AI insights for project:', projectId);
    const response = await fetch(`${this.baseURL}/ai/insights/${projectId}`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  // ADDED: Missing getProjectInsights method (alternative name)
  async getProjectInsights(projectId) {
    console.log('📊 API: Getting project insights for project:', projectId);
    
    // Try the AI insights endpoint first
    try {
      const response = await fetch(`${this.baseURL}/ai/insights/${projectId}`, {
        headers: this.getAuthHeaders()
      });
      return this.handleResponse(response);
    } catch (error) {
      console.warn('⚠️ AI insights endpoint failed, trying alternative...');
      
      // Fallback: Try to construct insights from project data
      try {
        const projectResponse = await this.getProject(projectId);
        if (projectResponse && projectResponse.success) {
          return {
            success: true,
            insights: {
              summary: `Project "${projectResponse.data.name}" analysis`,
              recommendations: [
                'Project data loaded successfully',
                'Consider updating progress regularly',
                'Engage with team members for feedback'
              ],
              detailedInsights: [
                {
                  type: 'info',
                  message: 'Project insights are being generated...'
                }
              ]
            }
          };
        }
      } catch (fallbackError) {
        console.error('❌ Fallback insights also failed:', fallbackError);
      }
      
      throw error;
    }
  }

  // ============================================================================
  // CAREER DEVELOPMENT API METHODS
  // ============================================================================

  // Get career goals for current user or specific user
  async getCareerGoals(userId = null) {
    try {
      const endpoint = userId ? `/career/goals/${userId}` : '/career/goals';
      console.log('📊 API: Getting career goals...', endpoint);
      
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: this.getAuthHeaders()
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error('❌ Error getting career goals:', error);
      throw error;
    }
  }

  // Create a new career goal
  async createCareerGoal(goalData) {
    try {
      console.log('✨ API: Creating career goal...', goalData);
      
      const response = await fetch(`${this.baseURL}/career/goals`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(goalData)
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error('❌ Error creating career goal:', error);
      throw error;
    }
  }

  // Update an existing career goal
  async updateCareerGoal(goalId, goalData) {
    try {
      console.log('📝 API: Updating career goal...', goalId, goalData);
      
      const response = await fetch(`${this.baseURL}/career/goals/${goalId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(goalData)
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error('❌ Error updating career goal:', error);
      throw error;
    }
  }

  // Delete a career goal
  async deleteCareerGoal(goalId) {
    try {
      console.log('🗑️ API: Deleting career goal...', goalId);
      
      const response = await fetch(`${this.baseURL}/career/goals/${goalId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error('❌ Error deleting career goal:', error);
      throw error;
    }
  }

  // Update goal progress specifically
  async updateGoalProgress(goalId, progress, notes = null) {
    try {
      console.log('📈 API: Updating goal progress:', goalId, 'to', progress + '%');
      
      const response = await fetch(`${this.baseURL}/career/goals/${goalId}/progress`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          progress: progress,
          notes: notes
        })
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error('❌ Error updating goal progress:', error);
      throw error;
    }
  }

  // Get user completed goals (renamed from getUserAchievements)
  async getUserCompletedGoals(userId = null) {
    try {
      const endpoint = userId ? `/career/completed/${userId}` : '/career/completed';
      console.log('🏆 API: Getting completed goals...', endpoint);
      
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: this.getAuthHeaders()
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error('❌ Error getting completed goals:', error);
      throw error;
    }
  }

  // Legacy method name for backward compatibility
  async getUserAchievements(userId = null) {
    console.log('⚠️ getUserAchievements is deprecated, using getUserCompletedGoals');
    return this.getUserCompletedGoals(userId);
  }

  // Get career statistics
  async getCareerStats(userId = null) {
    try {
      const endpoint = userId ? `/career/stats/${userId}` : '/career/stats';
      console.log('📊 API: Getting career stats...', endpoint);
      
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: this.getAuthHeaders()
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error('❌ Error getting career stats:', error);
      throw error;
    }
  }
  
  // Get goal progress history
  async getGoalProgressHistory(goalId) {
    try {
      console.log(`📈 API: Getting goal progress history for goal: ${goalId}`);
      const response = await fetch(`${this.baseURL}/career/goals/${goalId}/progress-history`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('❌ API error getting goal progress history:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  // Delete a completed goal (renamed from deleteAchievement)
  async deleteCompletedGoal(goalId) {
    try {
      console.log('🗑️ API: Deleting completed goal...', goalId);
      
      const response = await fetch(`${this.baseURL}/career/completed/${goalId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error('❌ Error deleting completed goal:', error);
      throw error;
    }
  }

  // Legacy method name for backward compatibility
  async deleteAchievement(achievementId) {
    console.log('⚠️ deleteAchievement is deprecated, using deleteCompletedGoal');
    return this.deleteCompletedGoal(achievementId);
  }

  // HEALTH CHECK
  async healthCheck() {
    console.log('📡 API: Health check...');
    const response = await fetch(`${this.baseURL}/health`);
    return this.handleResponse(response);
  }
}

// Create and export a single instance
const apiService = new ApiService();
export default apiService;