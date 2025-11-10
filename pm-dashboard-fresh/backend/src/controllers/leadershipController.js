// backend/src/controllers/leadershipController.js
// CLEAN VERSION - Node.js only, no JSX code

const { query } = require('../config/database');

/**
 * Get all leadership assessments for a user
 * GET /api/leadership/assessments
 * Query params: project_id (optional), user_id (optional - Executive Leaders only)
 */
const getLeadershipAssessments = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { project_id, user_id } = req.query;

    console.log(`📊 Fetching leadership assessments for user ${userId}, role: ${userRole}`);

    // Use provided user_id if user has permission, otherwise use authenticated user
    const targetUserId = user_id && userRole === 'Executive Leader' ? user_id : userId;

    let assessmentsQuery = `
      SELECT 
        la.*,
        p.name as project_name,
        p.description as project_description,
        p.status as project_status,
        u.name as user_name,
        u.role as user_role
      FROM leadership_assessments la
      LEFT JOIN projects p ON la.project_id = p.id
      LEFT JOIN users u ON la.user_id = u.id
      WHERE la.user_id = $1
    `;

    const queryParams = [targetUserId];

    if (project_id && project_id !== 'all') {
      assessmentsQuery += ` AND la.project_id = $${queryParams.length + 1}`;
      queryParams.push(project_id);
    }

    assessmentsQuery += ` ORDER BY la.created_at DESC`;

    const result = await query(assessmentsQuery, queryParams);
    
    const assessments = result.rows.map(assessment => ({
      ...assessment,
      responses: typeof assessment.responses === 'string' 
        ? JSON.parse(assessment.responses) 
        : assessment.responses
    }));

    console.log(`✅ Found ${assessments.length} leadership assessments`);

    res.json({
      success: true,
      assessments
    });

  } catch (error) {
    console.error('❌ Error fetching leadership assessments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leadership assessments'
    });
  }
};

/**
 * Submit a new leadership assessment
 * POST /api/leadership/assessments
 */
const submitLeadershipAssessment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { project_id, type, responses } = req.body;

    console.log(`📝 Submitting leadership assessment for user ${userId}`);
    console.log('Assessment data:', { project_id, type, responses });

    // Validate required fields
    if (!type || !responses) {
      return res.status(400).json({
        success: false,
        error: 'Assessment type and responses are required'
      });
    }

    // Validate that responses contains the expected Leadership Diamond dimensions
    const requiredDimensions = ['vision', 'reality', 'ethics', 'courage'];
    const providedDimensions = Object.keys(responses);
    
    for (const dimension of requiredDimensions) {
      if (!responses[dimension]) {
        return res.status(400).json({
          success: false,
          error: `Missing responses for ${dimension} dimension`
        });
      }
    }

    // Calculate scores for each dimension (average of all questions in that dimension)
    const scores = {};
    let totalScore = 0;
    let totalQuestions = 0;

    for (const [dimension, dimensionResponses] of Object.entries(responses)) {
      const questionValues = Object.values(dimensionResponses);
      const dimensionScore = questionValues.reduce((sum, val) => sum + parseFloat(val), 0) / questionValues.length;
      scores[`${dimension}_score`] = parseFloat(dimensionScore.toFixed(2));
      totalScore += dimensionScore;
      totalQuestions += questionValues.length;
    }

    // Calculate overall score
    const overallScore = totalScore / requiredDimensions.length;
    scores.overall_score = parseFloat(overallScore.toFixed(2));

    // Insert assessment into database
    const insertQuery = `
      INSERT INTO leadership_assessments (
        user_id, 
        project_id, 
        type, 
        responses, 
        vision_score, 
        reality_score, 
        ethics_score, 
        courage_score, 
        overall_score
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, created_at
    `;

    const insertParams = [
      userId,
      project_id || null,
      type,
      JSON.stringify(responses),
      scores.vision_score,
      scores.reality_score,
      scores.ethics_score,
      scores.courage_score,
      scores.overall_score
    ];

    console.log('📊 Inserting leadership assessment:', insertParams);
    
    const result = await query(insertQuery, insertParams);
    
    if (result.rows.length === 0) {
      throw new Error('Failed to insert assessment');
    }

    const newAssessment = result.rows[0];
    
    console.log(`✅ Leadership assessment submitted successfully: ID ${newAssessment.id}`);
    
    res.status(201).json({
      success: true,
      message: 'Leadership assessment submitted successfully',
      assessment: {
        id: newAssessment.id,
        user_id: userId,
        project_id: project_id || null,
        type,
        responses,
        scores,
        created_at: newAssessment.created_at
      }
    });
    
  } catch (error) {
    console.error('❌ Error submitting leadership assessment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit leadership assessment'
    });
  }
};

/**
 * Get specific leadership assessment by ID
 * GET /api/leadership/assessments/:id
 */
const getLeadershipAssessmentById = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const assessmentId = parseInt(req.params.id);

    if (isNaN(assessmentId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid assessment ID'
      });
    }

    let assessmentQuery = `
      SELECT 
        la.*,
        p.name as project_name,
        p.description as project_description,
        p.status as project_status,
        u.name as user_name,
        u.role as user_role
      FROM leadership_assessments la
      LEFT JOIN projects p ON la.project_id = p.id
      LEFT JOIN users u ON la.user_id = u.id
      WHERE la.id = $1
    `;

    const queryParams = [assessmentId];

    // Only allow users to see their own assessments unless they're Executive Leaders
    if (userRole !== 'Executive Leader') {
      assessmentQuery += ` AND la.user_id = $2`;
      queryParams.push(userId);
    }

    const result = await query(assessmentQuery, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Leadership assessment not found'
      });
    }

    const assessment = {
      ...result.rows[0],
      responses: typeof result.rows[0].responses === 'string' 
        ? JSON.parse(result.rows[0].responses) 
        : result.rows[0].responses
    };

    console.log(`✅ Found leadership assessment: ID ${assessmentId}`);

    res.json({
      success: true,
      assessment
    });

  } catch (error) {
    console.error('❌ Error fetching leadership assessment by ID:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leadership assessment'
    });
  }
};

/**
 * Get leadership metrics and analytics
 * GET /api/leadership/metrics
 */
const getLeadershipMetrics = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { project_id, user_id } = req.query;

    console.log(`📊 Fetching leadership metrics for user ${userId}, role: ${userRole}`);

    // Use provided user_id if user has permission, otherwise use authenticated user
    const targetUserId = user_id && userRole === 'Executive Leader' ? user_id : userId;

    let metricsQuery = `
      SELECT 
        COUNT(la.id) as total_assessments,
        AVG(la.vision_score) as avg_vision_score,
        AVG(la.reality_score) as avg_reality_score,
        AVG(la.ethics_score) as avg_ethics_score,
        AVG(la.courage_score) as avg_courage_score,
        AVG(la.overall_score) as avg_overall_score,
        MIN(la.created_at) as first_assessment,
        MAX(la.created_at) as latest_assessment
      FROM leadership_assessments la
      WHERE la.user_id = $1
    `;

    const queryParams = [targetUserId];

    if (project_id && project_id !== 'all') {
      metricsQuery += ` AND la.project_id = $${queryParams.length + 1}`;
      queryParams.push(project_id);
    }

    const result = await query(metricsQuery, queryParams);
    const metrics = result.rows[0];

    // Convert numeric strings to numbers and handle nulls
    const processedMetrics = {
      total_assessments: parseInt(metrics.total_assessments) || 0,
      avg_vision_score: parseFloat(metrics.avg_vision_score) || 0,
      avg_reality_score: parseFloat(metrics.avg_reality_score) || 0,
      avg_ethics_score: parseFloat(metrics.avg_ethics_score) || 0,
      avg_courage_score: parseFloat(metrics.avg_courage_score) || 0,
      avg_overall_score: parseFloat(metrics.avg_overall_score) || 0,
      first_assessment: metrics.first_assessment,
      latest_assessment: metrics.latest_assessment
    };

    console.log(`✅ Leadership metrics calculated: ${processedMetrics.total_assessments} assessments`);

    res.json({
      success: true,
      metrics: processedMetrics
    });

  } catch (error) {
    console.error('❌ Error fetching leadership metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leadership metrics'
    });
  }
};

/**
 * Delete a leadership assessment
 * DELETE /api/leadership/assessments/:id
 */
const deleteLeadershipAssessment = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const assessmentId = parseInt(req.params.id);

    if (isNaN(assessmentId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid assessment ID'
      });
    }

    let deleteQuery = `
      DELETE FROM leadership_assessments 
      WHERE id = $1
    `;

    const queryParams = [assessmentId];

    // Only allow users to delete their own assessments unless they're Executive Leaders
    if (userRole !== 'Executive Leader') {
      deleteQuery += ` AND user_id = $2`;
      queryParams.push(userId);
    }

    deleteQuery += ` RETURNING id`;

    const result = await query(deleteQuery, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Leadership assessment not found or access denied'
      });
    }

    console.log(`✅ Leadership assessment deleted: ID ${assessmentId}`);

    res.json({
      success: true,
      message: 'Leadership assessment deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting leadership assessment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete leadership assessment'
    });
  }
};

module.exports = {
  getLeadershipAssessments,
  submitLeadershipAssessment,
  getLeadershipAssessmentById,
  getLeadershipMetrics,
  deleteLeadershipAssessment
};