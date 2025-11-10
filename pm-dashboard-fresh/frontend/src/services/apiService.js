// frontend/services/apiService.js
// FINAL CORRECTED VERSION - Fixes all 3 issues found in your codebase

class ApiService {
  constructor() {
    // FIX 1: Correct port - your backend runs on 5001, not 3001
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
    this.token = localStorage.getItem('token');
    console.log('🔧 API Service initialized with correct baseURL:', this.baseURL);
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

  // FIX 2 & 3: Corrected login method to match your LoginPage call format and backend response
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
      
      // Your backend returns: { success: true, user: {...}, message: "Login successful" }
      if (data.success && data.user) {
        // Create a simple token from user ID since your backend doesn't use JWT
        this.token = `user_${data.user.id}`;
        localStorage.setItem('token', this.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        console.log('✅ Login successful');
        console.log('👤 User:', data.user.name, `(${data.user.role})`);
        
        // Return the exact format your LoginPage expects
        return {
          success: true,
          user: data.user,
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
    const isAuth = hasToken && hasUser;
    console.log('🔐 Authentication check:', isAuth);
    return isAuth;
  }

  // ========== PROJECT METHODS ==========

  async getProjects() {
    try {
      const response = await fetch(`${this.baseURL}/api/projects`, {
        method: 'GET',
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

  // ========== USER METHODS ==========

  async getUsers() {
    try {
      const response = await fetch(`${this.baseURL}/api/users`, {
        method: 'GET',
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
        method: 'GET',
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

  // ========== LEADERSHIP DIAMOND ASSESSMENT METHODS ==========

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

  async deleteLeadershipAssessment(assessmentId) {
    try {
      const response = await fetch(`${this.baseURL}/api/leadership/assessments/${assessmentId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error deleting leadership assessment:', error);
      throw error;
    }
  }

  async getLeadershipFramework() {
    try {
      const response = await fetch(`${this.baseURL}/api/leadership/framework`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching leadership framework:', error);
      throw error;
    }
  }

  // ========== OTHER METHODS ==========

  async getTeamMembers() {
    try {
      const response = await fetch(`${this.baseURL}/api/teams/members`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching team members:', error);
      throw error;
    }
  }

  async getCareerAssessments() {
    try {
      const response = await fetch(`${this.baseURL}/api/career/assessments`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching career assessments:', error);
      throw error;
    }
  }

  async submitCareerAssessment(assessmentData) {
    try {
      const response = await fetch(`${this.baseURL}/api/career/assessments`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(assessmentData),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error submitting career assessment:', error);
      throw error;
    }
  }

  async getValueAssessments() {
    try {
      const response = await fetch(`${this.baseURL}/api/value/assessments`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching value assessments:', error);
      throw error;
    }
  }

  async submitValueAssessment(assessmentData) {
    try {
      const response = await fetch(`${this.baseURL}/api/value/assessments`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(assessmentData),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error submitting value assessment:', error);
      throw error;
    }
  }

  // Health checks
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }
}

// Helper functions for leadership assessments
export const calculateDiamondMetrics = (assessments, selectedProject = 'all') => {
  if (!assessments || assessments.length === 0) {
    return {
      vision: 0,
      reality: 0,
      ethics: 0,
      courage: 0,
      overall: 0,
      count: 0
    };
  }

  let filteredAssessments = assessments;
  if (selectedProject !== 'all') {
    filteredAssessments = assessments.filter(assessment => 
      assessment.project_id === parseInt(selectedProject)
    );
  }

  if (filteredAssessments.length === 0) {
    return {
      vision: 0,
      reality: 0,
      ethics: 0,
      courage: 0,
      overall: 0,
      count: 0
    };
  }

  // Get the most recent assessment for current metrics
  const latestAssessment = filteredAssessments.reduce((latest, current) => {
    return new Date(current.created_at) > new Date(latest.created_at) ? current : latest;
  });

  return {
    vision: latestAssessment.vision_score || 0,
    reality: latestAssessment.reality_score || 0,
    ethics: latestAssessment.ethics_score || 0,
    courage: latestAssessment.courage_score || 0,
    overall: latestAssessment.overall_score || 0,
    count: filteredAssessments.length
  };
};

// Helper function to get score color based on value
export const getScoreColor = (score) => {
  if (score >= 6) return '#22c55e'; // green - excellent
  if (score >= 4) return '#eab308'; // yellow - good
  if (score >= 2) return '#f97316'; // orange - developing
  return '#ef4444'; // red - needs improvement
};

// Helper function to get score label
export const getScoreLabel = (score) => {
  if (score >= 6) return 'Excellent';
  if (score >= 4) return 'Good';
  if (score >= 2) return 'Developing';
  return 'Needs Improvement';
};

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;