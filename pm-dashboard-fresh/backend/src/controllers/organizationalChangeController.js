// backend/controllers/organizationalChangeController.js
const { query: db } = require('../config/database');

class OrganizationalChangeController {
  // Get organizational change assessments with filtering
  async getOrganizationalChangeAssessments(req, res) {
    try {
      const { project_id, user_id, type = 'organizational_change' } = req.query;
      const currentUserId = req.user.id;
      const userRole = req.user.role;

      console.log('📊 Getting organizational change assessments:', {
        project_id,
        user_id,
        type,
        currentUserId,
        userRole
      });

      let query = `
        SELECT 
          oca.*,
          u.name as user_name,
          u.email as user_email,
          u.role as user_role,
          p.name as project_name,
          (oca.vision_score + oca.alignment_score + oca.understanding_score + oca.enactment_score) / 4.0 as overall_score
        FROM organizational_change_assessments oca
        LEFT JOIN users u ON oca.user_id = u.id
        LEFT JOIN projects p ON oca.project_id = p.id
        WHERE oca.assessment_type = $1
      `;

      const params = [type];
      let paramCount = 1;

      // Filter by project if specified
      if (project_id && project_id !== 'all' && !isNaN(parseInt(project_id))) {
        paramCount++;
        query += ` AND oca.project_id = $${paramCount}`;
        params.push(parseInt(project_id));
      }

      // Role-based access control
      if (userRole === 'Team Member') {
        // Team members can only see their own assessments
        paramCount++;
        query += ` AND oca.user_id = $${paramCount}`;
        params.push(currentUserId);
      } else if (userRole === 'Manager') {
        // Managers can see all assessments for projects they manage
        paramCount++;
        query += ` AND (oca.user_id = $${paramCount} OR EXISTS (
          SELECT 1 FROM projects WHERE id = oca.project_id AND manager_id = $${paramCount}
        ))`;
        params.push(currentUserId);
      }
      // Executive Leaders can see all assessments (no additional filter)

      // Filter by specific user if requested and user has permission
      if (user_id && (userRole === 'Executive Leader' || userRole === 'Manager') && !isNaN(parseInt(user_id))) {
        paramCount++;
        query += ` AND oca.user_id = $${paramCount}`;
        params.push(parseInt(user_id));
      }

      query += ` ORDER BY oca.created_at DESC`;

      const result = await db(query, params);

      console.log(`✅ Found ${result.rows.length} organizational change assessments`);

      res.json({
        success: true,
        assessments: result.rows,
        message: `Found ${result.rows.length} organizational change assessments`
      });

    } catch (error) {
      console.error('❌ Error getting organizational change assessments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get organizational change assessments',
        error: error.message
      });
    }
  }

  // Submit new organizational change assessment
  async submitOrganizationalChangeAssessment(req, res) {
    try {
      const { project_id, type = 'organizational_change', responses } = req.body;
      const userId = req.user.id;

      console.log('📝 Submitting organizational change assessment:', {
        userId,
        project_id,
        type,
        responses: Object.keys(responses || {})
      });

      // Validate responses
      if (!responses || typeof responses !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Assessment responses are required'
        });
      }

      // Calculate dimension scores from responses - use bound method
      const scores = this.calculateDimensionScores(responses);

      console.log('📊 Calculated scores:', scores);

      // Insert assessment into database
      const insertQuery = `
        INSERT INTO organizational_change_assessments (
          user_id, project_id, assessment_type, vision_score, alignment_score, 
          understanding_score, enactment_score, responses
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const insertParams = [
        userId,
        project_id || null,
        type,
        scores.vision,
        scores.alignment,
        scores.understanding,
        scores.enactment,
        JSON.stringify(responses)
      ];

      const result = await db(insertQuery, insertParams);

      console.log('✅ Organizational change assessment submitted successfully:', result.rows[0].id);

      res.json({
        success: true,
        assessment: result.rows[0],
        message: 'Organizational change assessment submitted successfully'
      });

    } catch (error) {
      console.error('❌ Error submitting organizational change assessment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit organizational change assessment',
        error: error.message
      });
    }
  }

  // Calculate dimension scores from responses - BOUND METHOD
  calculateDimensionScores(responses) {
    console.log('🔢 Calculating dimension scores from:', responses);
    
    const dimensions = ['vision', 'alignment', 'understanding', 'enactment'];
    const scores = {};

    dimensions.forEach(dimension => {
      const dimensionResponses = responses[dimension];
      console.log(`📊 Processing ${dimension}:`, dimensionResponses);
      
      if (dimensionResponses && typeof dimensionResponses === 'object') {
        const values = Object.values(dimensionResponses).filter(val => 
          typeof val === 'number' && val >= 1 && val <= 7
        );
        
        if (values.length > 0) {
          scores[dimension] = values.reduce((sum, val) => sum + val, 0) / values.length;
        } else {
          scores[dimension] = 0;
        }
      } else {
        scores[dimension] = 0;
      }
    });

    // Round to 1 decimal place
    Object.keys(scores).forEach(key => {
      scores[key] = Math.round(scores[key] * 10) / 10;
    });

    console.log('✅ Final scores:', scores);
    return scores;
  }

  // Get organizational change analytics - TEAM AVERAGES (no user filtering)
  async getOrganizationalChangeAnalytics(req, res) {
    try {
      const { project_id } = req.query;
      const userRole = req.user.role;
      const userId = req.user.id;

      console.log('📈 Getting organizational change analytics:', { project_id, userRole, userId });

      // For analytics/averages, we want ALL team data regardless of role
      // Only filter by project if specified
      let query = `
        SELECT 
          oca.user_id,
          oca.project_id,
          u.name as user_name,
          u.email as user_email,
          u.role as user_role,
          p.name as project_name,
          oca.vision_score,
          oca.alignment_score,
          oca.understanding_score,
          oca.enactment_score,
          (oca.vision_score + oca.alignment_score + oca.understanding_score + oca.enactment_score) / 4.0 as overall_score,
          oca.created_at
        FROM organizational_change_assessments oca
        LEFT JOIN users u ON oca.user_id = u.id
        LEFT JOIN projects p ON oca.project_id = p.id
        WHERE 1=1
      `;

      const params = [];
      let paramCount = 0;

      // Only filter by project if specified (not by user for analytics)
      if (project_id && project_id !== 'all' && !isNaN(parseInt(project_id))) {
        paramCount++;
        query += ` AND oca.project_id = $${paramCount}`;
        params.push(parseInt(project_id));
      }

      query += ` ORDER BY oca.created_at DESC`;

      const result = await db(query, params);

      // Calculate summary statistics - use bound method
      const analytics = this.calculateAnalytics(result.rows);

      console.log('✅ Organizational change analytics calculated for all team members');

      res.json({
        success: true,
        analytics: analytics,
        assessments: result.rows
      });

    } catch (error) {
      console.error('❌ Error getting organizational change analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get organizational change analytics',
        error: error.message
      });
    }
  }

  // Calculate analytics from assessment data - BOUND METHOD
  calculateAnalytics(assessments) {
    if (!assessments || assessments.length === 0) {
      return {
        totalAssessments: 0,
        uniqueParticipants: 0,
        averageScores: {
          vision: 0,
          alignment: 0,
          understanding: 0,
          enactment: 0,
          overall: 0
        },
        scoreDistribution: {
          excellent: 0,
          good: 0,
          developing: 0,
          needsImprovement: 0
        },
        trendData: []
      };
    }

    const totalAssessments = assessments.length;
    const uniqueParticipants = new Set(assessments.map(a => a.user_id)).size;

    // Calculate average scores - use bound method
    const averageScores = {
      vision: this.calculateAverage(assessments, 'vision_score'),
      alignment: this.calculateAverage(assessments, 'alignment_score'),
      understanding: this.calculateAverage(assessments, 'understanding_score'),
      enactment: this.calculateAverage(assessments, 'enactment_score'),
      overall: this.calculateAverage(assessments, 'overall_score')
    };

    // Calculate score distribution based on overall scores
    const scoreDistribution = {
      excellent: assessments.filter(a => a.overall_score >= 6).length,
      good: assessments.filter(a => a.overall_score >= 4 && a.overall_score < 6).length,
      developing: assessments.filter(a => a.overall_score >= 2 && a.overall_score < 4).length,
      needsImprovement: assessments.filter(a => a.overall_score < 2).length
    };

    // Create trend data (assessments over time) - use bound method
    const trendData = this.createTrendData(assessments);

    return {
      totalAssessments,
      uniqueParticipants,
      averageScores,
      scoreDistribution,
      trendData
    };
  }

  // Helper method to calculate average - BOUND METHOD
  calculateAverage(assessments, field) {
    const values = assessments.map(a => parseFloat(a[field])).filter(v => !isNaN(v) && v > 0);
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  // Helper method to create trend data - BOUND METHOD
  createTrendData(assessments) {
    const monthlyData = {};
    
    assessments.forEach(assessment => {
      const date = new Date(assessment.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          assessments: [],
          count: 0
        };
      }
      
      monthlyData[monthKey].assessments.push(assessment);
      monthlyData[monthKey].count++;
    });

    // Calculate averages for each month - use bound method
    return Object.values(monthlyData).map(month => ({
      month: month.month,
      count: month.count,
      averageOverallScore: this.calculateAverage(month.assessments, 'overall_score')
    })).sort((a, b) => a.month.localeCompare(b.month));
  }

  // Get assessment details by ID
  async getAssessmentDetails(req, res) {
    try {
      const { id } = req.params;
      const userRole = req.user.role;
      const userId = req.user.id;

      console.log('🔍 Getting assessment details:', { id, userRole, userId });

      let query = `
        SELECT 
          oca.*,
          u.name as user_name,
          u.email as user_email,
          u.role as user_role,
          p.name as project_name,
          (oca.vision_score + oca.alignment_score + oca.understanding_score + oca.enactment_score) / 4.0 as overall_score
        FROM organizational_change_assessments oca
        LEFT JOIN users u ON oca.user_id = u.id
        LEFT JOIN projects p ON oca.project_id = p.id
        WHERE oca.id = $1
      `;

      const params = [parseInt(id)];

      // Role-based access control
      if (userRole === 'Team Member') {
        query += ` AND oca.user_id = $2`;
        params.push(userId);
      } else if (userRole === 'Manager') {
        query += ` AND (oca.user_id = $2 OR EXISTS (
          SELECT 1 FROM projects WHERE id = oca.project_id AND manager_id = $2
        ))`;
        params.push(userId);
      }

      const result = await db(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Assessment not found or access denied'
        });
      }

      res.json({
        success: true,
        assessment: result.rows[0]
      });

    } catch (error) {
      console.error('❌ Error getting assessment details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get assessment details',
        error: error.message
      });
    }
  }

  // Update assessment 
  async updateAssessment(req, res) {
    try {
      const { id } = req.params;
      const { responses } = req.body;
      const userId = req.user.id;

      console.log('📝 Updating organizational change assessment:', { id, userId });

      // Check if user owns this assessment or has permission to edit
      const checkQuery = `
        SELECT * FROM organizational_change_assessments 
        WHERE id = $1 AND user_id = $2
      `;
      
      const checkResult = await db(checkQuery, [parseInt(id), userId]);
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Assessment not found or access denied'
        });
      }

      // Calculate new scores - use bound method
      const scores = this.calculateDimensionScores(responses);

      // Update assessment
      const updateQuery = `
        UPDATE organizational_change_assessments 
        SET vision_score = $2, alignment_score = $3, understanding_score = $4, 
            enactment_score = $5, responses = $6, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;

      const updateParams = [
        parseInt(id),
        scores.vision,
        scores.alignment,
        scores.understanding,
        scores.enactment,
        JSON.stringify(responses)
      ];

      const result = await db(updateQuery, updateParams);

      console.log('✅ Assessment updated successfully');

      res.json({
        success: true,
        assessment: result.rows[0],
        message: 'Assessment updated successfully'
      });

    } catch (error) {
      console.error('❌ Error updating assessment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update assessment',
        error: error.message
      });
    }
  }

  // Get team metrics for visualizations (accessible to all users)
  async getTeamMetrics(req, res) {
    try {
      const { project_id } = req.query;

      console.log('📊 Getting team metrics for visualizations:', { project_id, requestedBy: req.user.name });

      // Get ALL assessments for team metrics (no role-based filtering)
      let query = `
        SELECT 
          oca.vision_score,
          oca.alignment_score,
          oca.understanding_score,
          oca.enactment_score,
          oca.created_at,
          u.name as user_name
        FROM organizational_change_assessments oca
        LEFT JOIN users u ON oca.user_id = u.id
        WHERE 1=1
      `;

      const params = [];
      let paramCount = 0;

      // Only filter by project if specified
      if (project_id && project_id !== 'all' && !isNaN(parseInt(project_id))) {
        paramCount++;
        query += ` AND oca.project_id = $${paramCount}`;
        params.push(parseInt(project_id));
      }

      query += ` ORDER BY oca.created_at DESC`;

      const result = await db(query, params);
      const assessments = result.rows;

      // Calculate team averages
      const teamMetrics = {
        count: assessments.length,
        uniqueUsers: new Set(assessments.map(a => a.user_name)).size
      };

      if (assessments.length > 0) {
        // Calculate average scores across all team members
        teamMetrics.vision = this.calculateAverage(assessments, 'vision_score');
        teamMetrics.alignment = this.calculateAverage(assessments, 'alignment_score');
        teamMetrics.understanding = this.calculateAverage(assessments, 'understanding_score');
        teamMetrics.enactment = this.calculateAverage(assessments, 'enactment_score');
        teamMetrics.overall = (teamMetrics.vision + teamMetrics.alignment + teamMetrics.understanding + teamMetrics.enactment) / 4;
      } else {
        teamMetrics.vision = 0;
        teamMetrics.alignment = 0;
        teamMetrics.understanding = 0;
        teamMetrics.enactment = 0;
        teamMetrics.overall = 0;
      }

      console.log(`✅ Team metrics calculated: ${assessments.length} assessments from ${teamMetrics.uniqueUsers} users`);

      res.json({
        success: true,
        metrics: teamMetrics,
        message: `Team metrics based on ${assessments.length} assessments from ${teamMetrics.uniqueUsers} team members`
      });

    } catch (error) {
      console.error('❌ Error getting team metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get team metrics',
        error: error.message
      });
    }
  }

  // Delete assessment
  async deleteAssessment(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      console.log('🗑️ Deleting organizational change assessment:', { id, userId, userRole });

      let deleteQuery = `
        DELETE FROM organizational_change_assessments 
        WHERE id = $1
      `;
      const params = [parseInt(id)];

      // Role-based deletion control
      if (userRole !== 'Executive Leader') {
        deleteQuery += ` AND user_id = $2`;
        params.push(userId);
      }

      const result = await db(deleteQuery, params);

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Assessment not found or access denied'
        });
      }

      console.log('✅ Assessment deleted successfully');

      res.json({
        success: true,
        message: 'Assessment deleted successfully'
      });

    } catch (error) {
      console.error('❌ Error deleting assessment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete assessment',
        error: error.message
      });
    }
  }
}

// Create and export instance with proper binding
const controller = new OrganizationalChangeController();

// Bind all methods to ensure 'this' context is preserved
const boundController = {
  getOrganizationalChangeAssessments: controller.getOrganizationalChangeAssessments.bind(controller),
  submitOrganizationalChangeAssessment: controller.submitOrganizationalChangeAssessment.bind(controller),
  getOrganizationalChangeAnalytics: controller.getOrganizationalChangeAnalytics.bind(controller),
  getTeamMetrics: controller.getTeamMetrics.bind(controller),
  getAssessmentDetails: controller.getAssessmentDetails.bind(controller),
  updateAssessment: controller.updateAssessment.bind(controller),
  deleteAssessment: controller.deleteAssessment.bind(controller),
  calculateDimensionScores: controller.calculateDimensionScores.bind(controller),
  calculateAnalytics: controller.calculateAnalytics.bind(controller),
  calculateAverage: controller.calculateAverage.bind(controller),
  createTrendData: controller.createTrendData.bind(controller)
};

module.exports = boundController;