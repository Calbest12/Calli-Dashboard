// frontend/src/services/apiService.js
// Corrected API service that preserves your original authentication and adds leadership functionality

class ApiService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
    this.token = localStorage.getItem('token');
  }

  // Helper method to get headers
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  // Helper method to handle responses
  async handleResponse(response) {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  // AUTHENTICATION METHODS - RESTORED TO ORIGINAL FORMAT
  async login(loginData) {
    try {
      console.log('🔄 Login attempt with data:', { email: loginData.email, password: '***' });
      console.log('🌐 Full URL:', `${this.baseURL}/api/auth/login`);
      
      const response = await fetch(`${this.baseURL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginData.email,
          password: loginData.password
        }),
      });

      console.log('📡 Response status:', response.status);
      
      const data = await this.handleResponse(response);
      console.log('📄 Backend response:', data);
      
      // Your backend returns: { success: true, data: {...}, message: "Login successful" }
      if (data.success && data.data) {
        // Create a simple token from user ID since your backend doesn't use JWT
        this.token = `user_${data.data.id}`;
        localStorage.setItem('token', this.token);
        localStorage.setItem('user', JSON.stringify(data.data));
        
        console.log('✅ Login successful');
        console.log('👤 User:', data.data.name, `(${data.data.role})`);
        
        // Return the exact format your LoginPage expects
        return {
          success: true,
          user: data.data,
          message: data.message
        };
      } else {
        throw new Error(data.message || 'Login failed');
      }
      
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  }

  async register(userData) {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  logout() {
    this.token = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    console.log('🚪 Logged out');
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

  async updateUserProfile(userData) {
    try {
      const response = await fetch(`${this.baseURL}/api/users/profile`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(userData),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // LEADERSHIP DIAMOND ASSESSMENT METHODS
  async getLeadershipAssessments(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.project_id && params.project_id !== 'all') {
        queryParams.append('project_id', params.project_id);
      }
      if (params.user_id) {
        queryParams.append('user_id', params.user_id);
      }

      const url = `${this.baseURL}/api/leadership/assessments${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching leadership assessments:', error);
      throw error;
    }
  }

  async submitLeadershipAssessment(assessmentData) {
    try {
      const response = await fetch(`${this.baseURL}/api/leadership/assessments`, {
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

  async getLeadershipAssessmentDetails(assessmentId) {
    try {
      const response = await fetch(`${this.baseURL}/api/leadership/assessments/${assessmentId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching leadership assessment details:', error);
      throw error;
    }
  }

  async getLeadershipMetrics(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.project_id && params.project_id !== 'all') {
        queryParams.append('project_id', params.project_id);
      }
      if (params.user_id) {
        queryParams.append('user_id', params.user_id);
      }

      const url = `${this.baseURL}/api/leadership/metrics${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
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
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;