// backend/controllers/leadershipController.js
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
        p.title as project_title,
        p.description as project_description,
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
    const assessmentId = parseInt(req.params.id);

    if (isNaN(assessmentId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid assessment ID'
      });
    }

    const assessmentQuery = `
      SELECT 
        la.*,
        p.title as project_title,
        p.description as project_description,
        u.name as user_name
      FROM leadership_assessments la
      LEFT JOIN projects p ON la.project_id = p.id
      LEFT JOIN users u ON la.user_id = u.id
      WHERE la.id = $1 AND (la.user_id = $2 OR $3 = 'Executive Leader')
    `;

    const result = await query(assessmentQuery, [assessmentId, userId, req.user.role]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found or access denied'
      });
    }

    const assessment = {
      ...result.rows[0],
      responses: typeof result.rows[0].responses === 'string' 
        ? JSON.parse(result.rows[0].responses) 
        : result.rows[0].responses
    };

    res.json({
      success: true,
      assessment
    });

  } catch (error) {
    console.error('❌ Error getting leadership assessment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve assessment'
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
    const { project_id, user_id } = req.query;
    
    // Use provided user_id if user has permission, otherwise use authenticated user
    const targetUserId = user_id && (req.user.role === 'Executive Leader' || user_id === userId.toString()) 
      ? user_id : userId;

    console.log(`📈 Calculating leadership metrics for user ${targetUserId}`);

    let metricsQuery = `
      SELECT 
        COUNT(*) as total_assessments,
        AVG(vision_score) as avg_vision,
        AVG(reality_score) as avg_reality,
        AVG(ethics_score) as avg_ethics,
        AVG(courage_score) as avg_courage,
        AVG(overall_score) as avg_overall,
        MAX(created_at) as latest_assessment
      FROM leadership_assessments 
      WHERE user_id = $1
    `;

    const queryParams = [targetUserId];

    if (project_id && project_id !== 'all') {
      metricsQuery += ` AND project_id = $${queryParams.length + 1}`;
      queryParams.push(project_id);
    }

    const result = await query(metricsQuery, queryParams);
    const metrics = result.rows[0];

    // Get trend data (last 6 assessments)
    const trendQuery = `
      SELECT 
        vision_score,
        reality_score,
        ethics_score,
        courage_score,
        overall_score,
        created_at
      FROM leadership_assessments 
      WHERE user_id = $1
      ${project_id && project_id !== 'all' ? `AND project_id = $2` : ''}
      ORDER BY created_at DESC 
      LIMIT 6
    `;

    const trendParams = project_id && project_id !== 'all' ? [targetUserId, project_id] : [targetUserId];
    const trendResult = await query(trendQuery, trendParams);

    res.json({
      success: true,
      metrics: {
        ...metrics,
        avg_vision: parseFloat((metrics.avg_vision || 0).toFixed(2)),
        avg_reality: parseFloat((metrics.avg_reality || 0).toFixed(2)),
        avg_ethics: parseFloat((metrics.avg_ethics || 0).toFixed(2)),
        avg_courage: parseFloat((metrics.avg_courage || 0).toFixed(2)),
        avg_overall: parseFloat((metrics.avg_overall || 0).toFixed(2)),
      },
      trends: trendResult.rows.reverse() // Reverse to get chronological order
    });

  } catch (error) {
    console.error('❌ Error calculating leadership metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate metrics'
    });
  }
};

/**
 * Delete leadership assessment
 * DELETE /api/leadership/assessments/:id
 */
const deleteLeadershipAssessment = async (req, res) => {
  try {
    const userId = req.user.id;
    const assessmentId = parseInt(req.params.id);
    const userRole = req.user.role;

    if (isNaN(assessmentId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid assessment ID'
      });
    }

    console.log(`🗑️ Deleting leadership assessment ${assessmentId} for user ${userId}`);

    // Check if assessment exists and user has permission to delete
    const checkQuery = `
      SELECT user_id FROM leadership_assessments 
      WHERE id = $1 AND (user_id = $2 OR $3 = 'Executive Leader')
    `;
    
    const checkResult = await query(checkQuery, [assessmentId, userId, userRole]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found or access denied'
      });
    }

    const deleteQuery = `DELETE FROM leadership_assessments WHERE id = $1`;
    await query(deleteQuery, [assessmentId]);

    console.log(`✅ Leadership assessment ${assessmentId} deleted successfully`);

    res.json({
      success: true,
      message: 'Assessment deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting leadership assessment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete assessment'
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