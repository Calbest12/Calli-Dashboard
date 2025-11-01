const API_BASE_URL = 'http://localhost:5001/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  getAuthHeaders() {
    let token = localStorage.getItem('authToken') || 
                localStorage.getItem('token') || 
                localStorage.getItem('currentUserId');
    
    console.log('ðŸ”‘ Getting auth headers - token found:', !!token);
    console.log('ðŸ”‘ Token preview:', token ? token.substring(0, 10) + '...' : 'none');
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('âœ… Authorization header set');
    } else {
      console.warn('âš ï¸ No auth token found in localStorage');
    }
    
    return headers;
  }
  
  async handleResponse(response) {
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  async get(endpoint) {
    console.log('ðŸ”„ API GET:', endpoint);
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  async post(endpoint, data = {}) {
    console.log('ðŸ”„ API POST:', endpoint, data);
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse(response);
  }

  async put(endpoint, data = {}) {
    console.log('ðŸ”„ API PUT:', endpoint, data);
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse(response);
  }

  async delete(endpoint) {
    console.log('ðŸ”„ API DELETE:', endpoint);
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  async patch(endpoint, data = {}) {
    console.log('ðŸ”„ API PATCH:', endpoint, data);
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse(response);
  }

  async getAllProjects() {
    console.log('ðŸ“¡ API: Getting all projects...');
    const response = await fetch(`${this.baseURL}/projects`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  async getProject(id) {
    console.log('ðŸ“¡ API: Getting project:', id);
    const response = await fetch(`${this.baseURL}/projects/${id}`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  async createProject(projectData) {
    console.log('ðŸ“¡ API: Creating project:', projectData.name);
    const response = await fetch(`${this.baseURL}/projects`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(projectData)
    });
    return this.handleResponse(response);
  }

  async updateProject(id, projectData) {
    console.log('ðŸ“¡ API: Updating project:', id, projectData.name);
    const response = await fetch(`${this.baseURL}/projects/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(projectData)
    });
    return this.handleResponse(response);
  }

  async deleteProject(id) {
    console.log('ðŸ“¡ API: Deleting project:', id);
    const response = await fetch(`${this.baseURL}/projects/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  async getProjectHistory(projectId) {
    console.log('ðŸ“¡ API: Getting project history for:', projectId);
    const response = await fetch(`${this.baseURL}/projects/${projectId}/history`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  async getProjectAnalytics(projectId) {
    console.log('ðŸ“Š API: Getting project analytics for:', projectId);
    try {
      const response = await fetch(`${this.baseURL}/projects/${projectId}/analytics`, {
        headers: this.getAuthHeaders()
      });
      return this.handleResponse(response);
    } catch (error) {
      console.log('Analytics endpoint not available, will use fallback data');
      throw error;
    }
  }

  async getProjectComments(projectId) {
    console.log('ðŸ“¡ API: Getting comments for project:', projectId);
    const response = await fetch(`${this.baseURL}/projects/${projectId}/comments`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  async addProjectComment(projectId, commentData) {
    console.log('ðŸ“¡ API: Adding comment to project:', projectId);
    const response = await fetch(`${this.baseURL}/projects/${projectId}/comments`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(commentData)
    });
    return this.handleResponse(response);
  }

  async updateProjectComment(projectId, commentId, commentData) {
    console.log('ðŸ“¡ API: Updating comment:', commentId, 'for project:', projectId);
    const response = await fetch(`${this.baseURL}/projects/${projectId}/comments/${commentId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(commentData)
    });
    return this.handleResponse(response);
  }

  async deleteProjectComment(projectId, commentId, userData = {}) {
    console.log('ðŸ“¡ API: Deleting comment:', commentId, 'from project:', projectId);
    const response = await fetch(`${this.baseURL}/projects/${projectId}/comments/${commentId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData)
    });
    return this.handleResponse(response);
  }

  async getProjectTeam(projectId) {
    console.log('ðŸ“¡ API: Getting team for project:', projectId);
    const response = await fetch(`${this.baseURL}/projects/${projectId}/team`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  async addTeamMember(projectId, memberData) {
    console.log('ðŸ“¡ API: Adding team member to project:', projectId, memberData.name);
    const response = await fetch(`${this.baseURL}/projects/${projectId}/team`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(memberData)
    });
    return this.handleResponse(response);
  }

  async updateTeamMember(projectId, memberId, memberData) {
    console.log('ðŸ“¡ API: Updating team member:', memberId, 'for project:', projectId);
    const response = await fetch(`${this.baseURL}/projects/${projectId}/team/${memberId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(memberData)
    });
    return this.handleResponse(response);
  }

  async removeTeamMember(projectId, memberId) {
    console.log('ðŸ“¡ API: Removing team member:', memberId, 'from project:', projectId);
    const response = await fetch(`${this.baseURL}/projects/${projectId}/team/${memberId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  async submitProjectFeedback(projectId, feedbackData) {
    console.log('ðŸ“¡ API: Submitting feedback for project:', projectId);
    console.log('ðŸ“Š Feedback data being sent:', feedbackData);
    
    try {
      const response = await fetch(`${this.baseURL}/projects/${projectId}/feedback`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(feedbackData)
      });
      
      console.log('ðŸ“¡ Raw feedback response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('âŒ Feedback submission failed:', errorData);
        throw new Error(errorData?.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('âœ… Feedback submission successful:', result);
      
      return result;
    } catch (error) {
      console.error('âŒ API Error submitting feedback:', error);
      throw error;
    }
  }

  async getProjectFeedback(projectId) {
    console.log('ðŸ“¡ API: Getting feedback for project:', projectId);
    
    try {
      const response = await fetch(`${this.baseURL}/projects/${projectId}/feedback`, {
        headers: this.getAuthHeaders()
      });
      
      console.log('ðŸ“¡ Raw get feedback response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('âŒ Get feedback failed:', errorData);
        throw new Error(errorData?.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // TRANSFORM: Fix the data structure for frontend compatibility
      if (result.success && result.data && result.data.length > 0) {
        result.data = result.data.map(feedback => {
          return {
            id: feedback.id,
            projectId: feedback.project_id || feedback.projectId,
            userId: feedback.user_id || feedback.userId,
            userName: feedback.user_name || feedback.userName || 'Anonymous',
            timestamp: feedback.created_at || feedback.submitted_at || feedback.timestamp,
            
            // Transform to expected data structure
            data: {
              PM_Vision: feedback.pm_vision || 0,
              PM_Time: feedback.pm_time || 0,
              PM_Quality: feedback.pm_quality || 0,
              PM_Cost: feedback.pm_cost || 0,
              Leadership_Vision: feedback.leadership_vision || 0,
              Leadership_Reality: feedback.leadership_reality || 0,
              Leadership_Ethics: feedback.leadership_ethics || 0,
              Leadership_Courage: feedback.leadership_courage || 0,
              ChangeMgmt_Alignment: feedback.change_mgmt_alignment || 0,
              ChangeMgmt_Understand: feedback.change_mgmt_understand || 0,
              ChangeMgmt_Enact: feedback.change_mgmt_enact || 0,
              CareerDev_KnowYourself: feedback.career_dev_know_yourself || 0,
              CareerDev_KnowYourMarket: feedback.career_dev_know_market || 0,
              CareerDev_TellYourStory: feedback.career_dev_tell_story || 0
            },
            
            // Transform to expected averages structure
            averages: {
              PM: parseFloat(feedback.pm_average) || 0,
              Leadership: parseFloat(feedback.leadership_average) || 0,
              ChangeMgmt: parseFloat(feedback.change_mgmt_average) || 0,
              CareerDev: parseFloat(feedback.career_dev_average) || 0
            },
            
            overall: parseFloat(feedback.overall_average) || 0
          };
        });
      }
      
      console.log('âœ… Get feedback successful and transformed:', result);
      return result;
      
    } catch (error) {
      console.error('âŒ API Error getting feedback:', error);
      throw error;
    }
  }

  async getAllUsers() {
    console.log('ðŸ“¡ API: Getting all users...');
    const response = await fetch(`${this.baseURL}/users`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  async getUser(userId) {
    console.log('ðŸ“¡ API: Getting user:', userId);
    const response = await fetch(`${this.baseURL}/users/${userId}`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  async createUser(userData) {
    console.log('ðŸ“¡ API: Creating user:', userData.name);
    const response = await fetch(`${this.baseURL}/users`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData)
    });
    return this.handleResponse(response);
  }

  async updateUser(userId, userData) {
    console.log('ðŸ“¡ API: Updating user:', userId);
    const response = await fetch(`${this.baseURL}/users/${userId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData)
    });
    return this.handleResponse(response);
  }

  async deleteUser(userId) {
    console.log('ðŸ“¡ API: Deleting user:', userId);
    const response = await fetch(`${this.baseURL}/users/${userId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  async register(userData) {
    console.log('ðŸ“¡ API: Registering user:', userData.email);
    const response = await fetch(`${this.baseURL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return this.handleResponse(response);
  }
  

  async login(credentials) {
    console.log('ðŸ” API: Logging in user:', credentials.email);
    
    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      
      const result = await this.handleResponse(response);
      console.log('âœ… Login response:', result);
      
      const user = result.user || result.data;
      
      if (result.success && user) {
        const authToken = user.id.toString();
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('token', authToken);
        localStorage.setItem('currentUserId', authToken);
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        console.log('âœ… Auth token stored:', authToken);
        console.log('âœ… User stored:', user);
        
        return {
          success: true,
          user: user,
          message: result.message
        };
      }
      
      throw new Error('Invalid login response format - no user data found');
    } catch (error) {
      console.error('âŒ Login failed:', error);
      throw error;
    }
  }
  

  async logout() {
    console.log('ðŸ” API: Logging out...');
    
    try {
      const response = await fetch(`${this.baseURL}/auth/logout`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });

      localStorage.removeItem('authToken');
      localStorage.removeItem('token');
      localStorage.removeItem('currentUserId');
      localStorage.removeItem('currentUser');
      
      console.log('âœ… Logged out and cleaned localStorage');
      return await this.handleResponse(response);
    } catch (error) {
      console.error('âŒ Logout error:', error);
      localStorage.removeItem('authToken');
      localStorage.removeItem('token');
      localStorage.removeItem('currentUserId');
      localStorage.removeItem('currentUser');
      throw error;
    }
  }

  async updateProjectProgress(projectId, progressData) {
    console.log('ðŸ“¡ API: Updating project progress:', projectId);
    const response = await fetch(`${this.baseURL}/projects/${projectId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ progress: progressData })
    });
    return this.handleResponse(response);
  }

  async sendChatMessage(message, context = {}, projectId = null) {
    console.log('ðŸ“¡ API: Sending chat message...');
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

  async sendAIChat(data) {
    console.log('ðŸ“¡ API: Sending AI chat (alternative method)...');
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

  async getAIInsights(projectId) {
    console.log('ðŸ“Š API: Getting AI insights for project:', projectId);
    const response = await fetch(`${this.baseURL}/ai/insights/${projectId}`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  async getProjectInsights(projectId) {
    console.log('ðŸ“Š API: Getting project insights for project:', projectId);
    
    try {
      const response = await fetch(`${this.baseURL}/ai/insights/${projectId}`, {
        headers: this.getAuthHeaders()
      });
      return this.handleResponse(response);
    } catch (error) {
      console.warn('âš ï¸ AI insights endpoint failed, trying alternative...');
      
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
        console.error('âŒ Fallback insights also failed:', fallbackError);
      }
      
      throw error;
    }
  }

  async getCareerGoals(userId = null) {
    try {
      const endpoint = userId ? `/career/goals/${userId}` : '/career/goals';
      console.log('ðŸ“Š API: Getting career goals...', endpoint);
      
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: this.getAuthHeaders()
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error('âŒ Error getting career goals:', error);
      throw error;
    }
  }

  async createCareerGoal(goalData) {
    try {
      console.log('âœ¨ API: Creating career goal...', goalData);
      
      const response = await fetch(`${this.baseURL}/career/goals`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(goalData)
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error('âŒ Error creating career goal:', error);
      throw error;
    }
  }

  async updateCareerGoal(goalId, goalData) {
    try {
      console.log('ðŸ“ API: Updating career goal...', goalId, goalData);
      
      const response = await fetch(`${this.baseURL}/career/goals/${goalId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(goalData)
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error('âŒ Error updating career goal:', error);
      throw error;
    }
  }

  async deleteCareerGoal(goalId) {
    try {
      console.log('ðŸ—‘ï¸ API: Deleting career goal...', goalId);
      
      const response = await fetch(`${this.baseURL}/career/goals/${goalId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error('âŒ Error deleting career goal:', error);
      throw error;
    }
  }

  async updateGoalProgress(goalId, progress, notes = null) {
    try {
      console.log('ðŸ“ˆ API: Updating goal progress:', goalId, 'to', progress + '%');
      
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
      console.error('âŒ Error updating goal progress:', error);
      throw error;
    }
  }
  

  async getUserCompletedGoals(userId = null) {
    try {
      const endpoint = userId ? `/career/completed/${userId}` : '/career/completed';
      console.log('ðŸ† API: Getting completed goals...', endpoint);
      
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: this.getAuthHeaders()
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error('âŒ Error getting completed goals:', error);
      throw error;
    }
  }

  async getUserAchievements(userId = null) {
    console.log('âš ï¸ getUserAchievements is deprecated, using getUserCompletedGoals');
    return this.getUserCompletedGoals(userId);
  }

  async getCareerStats(userId = null) {
    try {
      const endpoint = userId ? `/career/stats/${userId}` : '/career/stats';
      console.log('ðŸ“Š API: Getting career stats...', endpoint);
      
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: this.getAuthHeaders()
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error('âŒ Error getting career stats:', error);
      throw error;
    }
  }
  
  async getGoalProgressHistory(goalId) {
    try {
      console.log(`ðŸ“ˆ API: Getting goal progress history for goal: ${goalId}`);
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
      console.error('âŒ API error getting goal progress history:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  async deleteCompletedGoal(goalId) {
    try {
      console.log('ðŸ—‘ï¸ API: Deleting completed goal...', goalId);
      
      const response = await fetch(`${this.baseURL}/career/completed/${goalId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error('âŒ Error deleting completed goal:', error);
      throw error;
    }
  }

  async deleteAchievement(achievementId) {
    console.log('âš ï¸ deleteAchievement is deprecated, using deleteCompletedGoal');
    return this.deleteCompletedGoal(achievementId);
  }
  async saveDiamondAssessment(assessmentData) {
    console.log('ðŸ’Ž API: Saving Diamond assessment...', assessmentData);
    try {
      return await this.post('/leadership/diamond-assessment', assessmentData);
    } catch (error) {
      console.warn('Primary endpoint failed, trying alternative...');
      return await this.post('/api/leadership/diamond-assessments', assessmentData);
    }
  }

  async getDiamondAssessments(userId) {
    console.log('ðŸ’Ž API: Getting Diamond assessments for user:', userId);
    try {
      return await this.get(`/leadership/diamond-assessments?user_id=${userId}`);
    } catch (error) {
      console.warn('Primary endpoint failed, trying alternative...');
      return await this.get(`/api/leadership/diamond-assessments?user_id=${userId}`);
    }
  }

  async saveValueAssessment(assessmentData) {
    console.log('ðŸŽ¯ API: Saving VALUE assessment...', assessmentData);
    try {
      return await this.post('/leadership/value-assessment', assessmentData);
    } catch (error) {
      console.warn('Primary endpoint failed, trying alternative...');
      return await this.post('/api/leadership/value-assessments', assessmentData);
    }
  }

  async getValueAssessments(userId) {
    console.log('ðŸŽ¯ API: Getting VALUE assessments for user:', userId);
    try {
      return await this.get(`/leadership/value-assessments?user_id=${userId}`);
    } catch (error) {
      console.warn('Primary endpoint failed, trying alternative...');
      return await this.get(`/api/leadership/value-assessments?user_id=${userId}`);
    }
  }

    // Executive Team Management
  async getExecutiveTeam() {
    console.log('ðŸ‘¥ API: Getting executive team...');
    const response = await fetch(`${this.baseURL}/team/executive`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  async assignTeamMembers(memberIds) {
    console.log('âœ… API: Assigning team members:', memberIds);
    const response = await fetch(`${this.baseURL}/team/assign`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ memberIds })
    });
    return this.handleResponse(response);
  }

  async removeTeamMembers(memberIds) {
    console.log('âŒ API: Removing team members:', memberIds);
    const response = await fetch(`${this.baseURL}/team/remove`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ memberIds })
    });
    return this.handleResponse(response);
  }

  async getExecutiveDashboard() {
    console.log('ðŸ“Š API: Getting executive dashboard...');
    const response = await fetch(`${this.baseURL}/team/executive/dashboard`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  async healthCheck() {
    console.log('ðŸ“¡ API: Health check...');
    const response = await fetch(`${this.baseURL}/health`);
    return this.handleResponse(response);
  }
}

const apiService = new ApiService();
export default apiService;