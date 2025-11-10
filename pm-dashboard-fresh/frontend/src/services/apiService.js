// frontend/services/apiService.js
// Enhanced API service with Leadership Diamond assessment integration

class ApiService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
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

  // Authentication methods
  async login(email, password) {
    const response = await fetch(`${this.baseURL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await this.handleResponse(response);
    
    if (data.token) {
      this.token = data.token;
      localStorage.setItem('token', data.token);
    }
    
    return data;
  }

  async register(userData) {
    const response = await fetch(`${this.baseURL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    return await this.handleResponse(response);
  }

  logout() {
    this.token = null;
    localStorage.removeItem('token');
  }

  // Projects methods
  async getProjects() {
    const response = await fetch(`${this.baseURL}/api/projects`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return await this.handleResponse(response);
  }

  async createProject(projectData) {
    const response = await fetch(`${this.baseURL}/api/projects`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(projectData),
    });

    return await this.handleResponse(response);
  }

  async updateProject(projectId, projectData) {
    const response = await fetch(`${this.baseURL}/api/projects/${projectId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(projectData),
    });

    return await this.handleResponse(response);
  }

  async deleteProject(projectId) {
    const response = await fetch(`${this.baseURL}/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return await this.handleResponse(response);
  }

  // User methods
  async getUsers() {
    const response = await fetch(`${this.baseURL}/api/users`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return await this.handleResponse(response);
  }

  async getUserProfile() {
    const response = await fetch(`${this.baseURL}/api/users/profile`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return await this.handleResponse(response);
  }

  async updateUserProfile(userData) {
    const response = await fetch(`${this.baseURL}/api/users/profile`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(userData),
    });

    return await this.handleResponse(response);
  }

  // Leadership Diamond Assessment Methods
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

  // Team management methods
  async getTeamMembers() {
    const response = await fetch(`${this.baseURL}/api/teams/members`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return await this.handleResponse(response);
  }

  async assignUserToProject(projectId, userId) {
    const response = await fetch(`${this.baseURL}/api/projects/${projectId}/assign`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userId }),
    });

    return await this.handleResponse(response);
  }

  // Career development methods
  async getCareerAssessments() {
    const response = await fetch(`${this.baseURL}/api/career/assessments`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return await this.handleResponse(response);
  }

  async submitCareerAssessment(assessmentData) {
    const response = await fetch(`${this.baseURL}/api/career/assessments`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(assessmentData),
    });

    return await this.handleResponse(response);
  }

  // VALUE assessment methods (if you have these)
  async getValueAssessments() {
    const response = await fetch(`${this.baseURL}/api/value/assessments`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return await this.handleResponse(response);
  }

  async submitValueAssessment(assessmentData) {
    const response = await fetch(`${this.baseURL}/api/value/assessments`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(assessmentData),
    });

    return await this.handleResponse(response);
  }

  // Analytics methods
  async getProjectAnalytics(projectId) {
    const response = await fetch(`${this.baseURL}/api/analytics/projects/${projectId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return await this.handleResponse(response);
  }

  async getTeamAnalytics() {
    const response = await fetch(`${this.baseURL}/api/analytics/teams`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return await this.handleResponse(response);
  }

  // AI chatbot methods
  async sendChatMessage(message, context = {}) {
    const response = await fetch(`${this.baseURL}/api/ai/chat`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ message, context }),
    });

    return await this.handleResponse(response);
  }

  // Health check
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseURL}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  // Leadership-specific health check
  async leadershipHealthCheck() {
    try {
      const response = await fetch(`${this.baseURL}/api/leadership/health`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Leadership service health check failed:', error);
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

// Helper function to get score interpretation
export const getScoreInterpretation = (score) => {
  if (score >= 6) return 'This dimension shows exceptional strength in your leadership approach.';
  if (score >= 4) return 'This dimension demonstrates competent leadership with room for growth.';
  if (score >= 2) return 'This dimension is developing and would benefit from focused improvement.';
  return 'This dimension requires significant attention and development.';
};

// Helper function to calculate team averages (for Executive Leaders)
export const calculateTeamAverages = (teamAssessments) => {
  if (!teamAssessments || teamAssessments.length === 0) {
    return {
      vision: 0,
      reality: 0,
      ethics: 0,
      courage: 0,
      overall: 0,
      count: 0,
      teamSize: 0
    };
  }

  const totalScores = teamAssessments.reduce((acc, assessment) => {
    acc.vision += assessment.vision_score || 0;
    acc.reality += assessment.reality_score || 0;
    acc.ethics += assessment.ethics_score || 0;
    acc.courage += assessment.courage_score || 0;
    acc.overall += assessment.overall_score || 0;
    return acc;
  }, { vision: 0, reality: 0, ethics: 0, courage: 0, overall: 0 });

  const teamSize = teamAssessments.length;

  return {
    vision: parseFloat((totalScores.vision / teamSize).toFixed(2)),
    reality: parseFloat((totalScores.reality / teamSize).toFixed(2)),
    ethics: parseFloat((totalScores.ethics / teamSize).toFixed(2)),
    courage: parseFloat((totalScores.courage / teamSize).toFixed(2)),
    overall: parseFloat((totalScores.overall / teamSize).toFixed(2)),
    count: teamSize,
    teamSize
  };
};

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;