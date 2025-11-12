// frontend/src/services/apiService.js - COMPLETE VERSION WITH ALL METHODS
class ApiService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
    this.token = localStorage.getItem('token');
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  async handleResponse(response) {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    return await response.json();
  }

  // AUTHENTICATION METHODS
  async login(credentials) {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await this.handleResponse(response);
      
      if (data.success && (data.user || data.data)) {
          // Handle both response formats: { user: ... } or { data: ... }
          const userData = data.user || data.data;
         
          // Create a simple token from user ID since your backend doesn't use JWT
          this.token = `user_${userData.id}`;
          localStorage.setItem('token', this.token);
          localStorage.setItem('user', JSON.stringify(userData));
          
          console.log('✅ Login successful');
          console.log('👤 User:', userData.name, `(${userData.role})`);
          
          return {
            success: true,
            user: userData,
            message: data.message
          };
        } else {
          throw new Error(data.message || 'Login failed');
        }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  logout() {
    this.token = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  getCurrentUser() {
    const userData = localStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : null;
    console.log('👤 Current user:', user?.name || 'None');
    return user;
  }

  isAuthenticated() {
    const hasToken = !!this.token && !!localStorage.getItem('token');
    const hasUser = !!localStorage.getItem('user');
    return hasToken && hasUser;
  }

  // BASIC HTTP METHODS
  async get(endpoint) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error(`Error with GET ${endpoint}:`, error);
      throw error;
    }
  }

  async post(endpoint, data) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error(`Error with POST ${endpoint}:`, error);
      throw error;
    }
  }

  async put(endpoint, data) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error(`Error with PUT ${endpoint}:`, error);
      throw error;
    }
  }

  async delete(endpoint) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error(`Error with DELETE ${endpoint}:`, error);
      throw error;
    }
  }

  // PROJECT MANAGEMENT METHODS
  async getProjects() {
    try {
      const response = await fetch(`${this.baseURL}/api/projects`, {
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  }

  async getAllProjects() {
    try {
      console.log('📡 Fetching all projects...');
      const response = await fetch(`${this.baseURL}/api/projects`, {
        headers: this.getHeaders(),
      });

      const result = await this.handleResponse(response);
      
      return {
        success: true,
        data: result.data || result.projects || result || []
      };
      
    } catch (error) {
      console.error('❌ Error fetching all projects:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  async createProject(projectData) {
    try {
      const response = await fetch(`${this.baseURL}/api/projects`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(projectData),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  async updateProject(projectId, projectData) {
    try {
      const response = await fetch(`${this.baseURL}/api/projects/${projectId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(projectData),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  async deleteProject(projectId) {
    try {
      const response = await fetch(`${this.baseURL}/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }

  async getProjectHistory(projectId) {
    try {
      const response = await fetch(`${this.baseURL}/api/projects/${projectId}/history`, {
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching project history:', error);
      throw error;
    }
  }

  // PROJECT TEAM METHODS - FIXED: These were missing!
  async getProjectTeam(projectId) {
    try {
      console.log('📡 Fetching project team for project:', projectId);
      const response = await fetch(`${this.baseURL}/api/projects/${projectId}/team`, {
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('❌ Error fetching project team:', error);
      return {
        success: false,
        error: error.message,
        team: []
      };
    }
  }

  async addProjectTeamMember(projectId, memberData) {
    try {
      console.log('➕ Adding team member to project:', projectId, memberData);
      const response = await fetch(`${this.baseURL}/api/projects/${projectId}/team`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(memberData),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('❌ Error adding project team member:', error);
      throw error;
    }
  }

  async removeProjectTeamMember(projectId, memberId) {
    try {
      console.log('➖ Removing team member from project:', projectId, memberId);
      const response = await fetch(`${this.baseURL}/api/projects/${projectId}/team/${memberId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('❌ Error removing project team member:', error);
      throw error;
    }
  }

  async updateProjectTeamMember(projectId, memberId, memberData) {
    try {
      console.log('✏️ Updating team member in project:', projectId, memberId, memberData);
      const response = await fetch(`${this.baseURL}/api/projects/${projectId}/team/${memberId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(memberData),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('❌ Error updating project team member:', error);
      throw error;
    }
  }

  // PROJECT COMMENT METHODS
  async getProjectComments(projectId) {
    try {
      console.log('📡 Fetching comments for project:', projectId);
      const response = await fetch(`${this.baseURL}/api/projects/${projectId}/comments`, {
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('❌ Error fetching project comments:', error);
      throw error;
    }
  }

  async addProjectComment(projectId, commentData) {
    try {
      console.log('💬 Adding comment to project:', projectId);
      const response = await fetch(`${this.baseURL}/api/projects/${projectId}/comments`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(commentData),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('❌ Error adding project comment:', error);
      throw error;
    }
  }

  async updateProjectComment(projectId, commentId, commentData) {
    try {
      console.log('✏️ Updating comment:', commentId, 'in project:', projectId);
      const response = await fetch(`${this.baseURL}/api/projects/${projectId}/comments/${commentId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(commentData),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('❌ Error updating project comment:', error);
      throw error;
    }
  }

  async deleteProjectComment(projectId, commentId) {
    try {
      console.log('🗑️ Deleting comment:', commentId, 'from project:', projectId);
      const response = await fetch(`${this.baseURL}/api/projects/${projectId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('❌ Error deleting project comment:', error);
      throw error;
    }
  }

  // ALIAS METHODS for backward compatibility
  async addProjectMember(projectId, memberData) {
    return this.addProjectTeamMember(projectId, memberData);
  }

  async removeProjectMember(projectId, memberId) {
    return this.removeProjectTeamMember(projectId, memberId);
  }

  async updateProjectMember(projectId, memberId, memberData) {
    return this.updateProjectTeamMember(projectId, memberId, memberData);
  }

  // USER MANAGEMENT METHODS
  async getUsers() {
    try {
      const response = await fetch(`${this.baseURL}/api/users`, {
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  async getAllUsers() {
    try {
      console.log('📡 Fetching all users...');
      const response = await fetch(`${this.baseURL}/api/users`, {
        headers: this.getHeaders(),
      });

      const result = await this.handleResponse(response);
      
      return {
        success: true,
        users: result.data || result.users || result || []
      };
      
    } catch (error) {
      console.error('❌ Error fetching all users:', error);
      return {
        success: false,
        error: error.message,
        users: []
      };
    }
  }

  async getAvailableUsers(projectId = null) {
    try {
      console.log('📡 Fetching available users for project:', projectId);
      const endpoint = projectId ? 
        `/api/projects/${projectId}/users/available` : 
        '/api/users/available';
        
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('❌ Error fetching available users:', error);
      return {
        success: false,
        error: error.message,
        users: []
      };
    }
  }

  async getUserProfile() {
    try {
      const response = await fetch(`${this.baseURL}/api/users/profile`, {
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  async updateUserProfile(profileData) {
    try {
      const response = await fetch(`${this.baseURL}/api/users/profile`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(profileData),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // LEADERSHIP ASSESSMENT METHODS
  async submitLeadershipAssessment(assessmentData) {
    try {
      const response = await fetch(`${this.baseURL}/api/assessments/leadership`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(assessmentData),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error submitting leadership assessment:', error);
      throw error;
    }
  }

  async getLeadershipMetrics(userId = null, projectId = null) {
    try {
      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);
      if (projectId) params.append('projectId', projectId);
      
      const url = `${this.baseURL}/api/assessments/leadership/metrics${
        params.toString() ? '?' + params.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching leadership metrics:', error);
      throw error;
    }
  }

  // TEAM MANAGEMENT METHODS (for Executive Leaders)
  async getTeamMembers() {
    try {
      const response = await fetch(`${this.baseURL}/api/team-management/members`, {
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching team members:', error);
      throw error;
    }
  }

  async assignTeamMember(assignmentData) {
    try {
      const response = await fetch(`${this.baseURL}/api/team-management/assign`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(assignmentData),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error assigning team member:', error);
      throw error;
    }
  }

  async removeTeamMember(teamMemberId) {
    try {
      const response = await fetch(`${this.baseURL}/api/team-management/remove/${teamMemberId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error removing team member:', error);
      throw error;
    }
  }

  async getTeamMetrics() {
    try {
      const response = await fetch(`${this.baseURL}/api/team-management/metrics`, {
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching team metrics:', error);
      throw error;
    }
  }

  // CAREER DEVELOPMENT METHODS
  async getCareerStats(targetUserId = null) {
    try {
      if (!targetUserId) {
        const user = this.getCurrentUser();
        if (!user?.id) {
          console.warn('No user ID available for career stats');
          return { success: false, error: 'No user available', data: { activeGoals: 0, completedGoals: 0, avgProgress: 0 } };
        }
        targetUserId = user.id;
      }
      
      if (!targetUserId) {
        console.warn('No target user ID provided for career stats');
        return { success: false, error: 'No user ID', data: { activeGoals: 0, completedGoals: 0, avgProgress: 0 } };
      }
      
      return this.get(`/api/career/stats/${targetUserId}`);
    } catch (error) {
      console.error('Error getting career stats:', error);
      return { success: false, error: error.message, data: { activeGoals: 0, completedGoals: 0, avgProgress: 0 } };
    }
  }

  async getUserProjects() {
    try {
      const result = await this.get('/api/projects');
      return {
        success: true,
        projects: result.data || result.projects || []
      };
    } catch (error) {
      console.error('Error getting user projects:', error);
      return { success: false, error: error.message, projects: [] };
    }
  }

  // EXECUTIVE METHODS
  async getExecutiveTeam() {
    try {
      return this.get('/api/team/executive');
    } catch (error) {
      console.error('Error getting executive team:', error);
      return { success: false, error: error.message, data: { teamMembers: [], unassignedMembers: [], totalTeamSize: 0 } };
    }
  }

  async getExecutiveDashboard() {
    try {
      return this.get('/api/team/executive/dashboard');
    } catch (error) {
      console.error('Error getting executive dashboard:', error);
      return { success: false, error: error.message, data: { teamSize: 0, totalProjects: 0, averageProgress: 0 } };
    }
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;