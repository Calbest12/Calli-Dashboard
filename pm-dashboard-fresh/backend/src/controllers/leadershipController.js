// backend/src/controllers/leadershipController.js
const { query } = require('../config/database');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * Get all leadership assessments for a user
 * GET /api/leadership/assessments
 */
const getLeadershipAssessments = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const { user_id, project_id } = req.query;
    
    // Use provided user_id if user has permission, otherwise use authenticated user
    const targetUserId = user_id && (req.user.role === 'Executive Leader' || user_id === userId.toString()) 
      ? parseInt(user_id) 
      : userId;

    let queryText = `
      SELECT 
        la.id,
        la.project_id,
        la.responses,
        la.created_at,
        la.updated_at,
        p.title as project_title,
        p.description as project_description,
        u.name as user_name
      FROM leadership_assessments la
      LEFT JOIN projects p ON la.project_id = p.id
      LEFT JOIN users u ON la.user_id = u.id
      WHERE la.user_id = $1
    `;
    
    const queryParams = [targetUserId];
    
    // Filter by project if specified
    if (project_id && project_id !== 'all') {
      queryText += ` AND la.project_id = $2`;
      queryParams.push(parseInt(project_id));
    }
    
    queryText += ` ORDER BY la.created_at DESC`;

    console.log('🔍 Leadership assessments query:', queryText, queryParams);
    
    const result = await query(queryText, queryParams);
    
    // Process assessments to ensure responses are properly parsed
    const assessments = result.rows.map(assessment => ({
      ...assessment,
      responses: typeof assessment.responses === 'string' 
        ? JSON.parse(assessment.responses) 
        : assessment.responses
    }));

    console.log(`✅ Retrieved ${assessments.length} leadership assessments for user ${targetUserId}`);
    
    res.json({
      success: true,
      assessments,
      count: assessments.length
    });
    
  } catch (error) {
    console.error('❌ Error getting leadership assessments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve leadership assessments'
    });
  }
});

/**
 * Submit a new leadership assessment
 * POST /api/leadership/assessments
 */
const submitLeadershipAssessment = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const { project_id, responses, type = 'leadership_diamond' } = req.body;

    // Validate required fields
    if (!responses || typeof responses !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Valid responses object is required'
      });
    }

    // Validate project exists and user has access if project_id is provided
    if (project_id) {
      const projectCheck = await query(
        'SELECT id FROM projects WHERE id = $1',
        [project_id]
      );
      
      if (projectCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid project ID'
        });
      }
    }

    // Calculate dimension scores from responses
    const dimensions = ['vision', 'reality', 'ethics', 'courage'];
    const scores = {};
    
    dimensions.forEach(dimension => {
      const dimensionResponses = Object.keys(responses)
        .filter(key => key.startsWith(`${dimension}_`))
        .map(key => parseInt(responses[key]) || 0);
      
      if (dimensionResponses.length > 0) {
        scores[`${dimension}_score`] = Math.round(
          (dimensionResponses.reduce((sum, score) => sum + score, 0) / dimensionResponses.length) * 10
        ) / 10;
      } else {
        scores[`${dimension}_score`] = 0;
      }
    });

    // Insert assessment into database
    const insertQuery = `
      INSERT INTO leadership_assessments (
        user_id, 
        project_id, 
        assessment_type,
        responses,
        vision_score,
        reality_score,
        ethics_score,
        courage_score,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
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
      scores.courage_score
    ];

    console.log('💾 Inserting leadership assessment:', insertParams);
    
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
});

/**
 * Get specific leadership assessment by ID
 * GET /api/leadership/assessments/:id
 */
const getLeadershipAssessmentById = asyncHandler(async (req, res) => {
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
});

/**
 * Get leadership metrics and analytics
 * GET /api/leadership/metrics
 */
const getLeadershipMetrics = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const { project_id, user_id } = req.query;
    
    // Use provided user_id if user has permission, otherwise use authenticated user
    const targetUserId = user_id && (req.user.role === 'Executive Leader' || user_id === userId.toString()) 
      ? parseInt(user_id) 
      : userId;

    let queryText = `
      SELECT 
        COUNT(*) as total_assessments,
        AVG(vision_score) as avg_vision,
        AVG(reality_score) as avg_reality,
        AVG(ethics_score) as avg_ethics,
        AVG(courage_score) as avg_courage,
        MAX(created_at) as latest_assessment,
        MIN(created_at) as first_assessment
      FROM leadership_assessments 
      WHERE user_id = $1
    `;
    
    const queryParams = [targetUserId];
    
    if (project_id && project_id !== 'all') {
      queryText += ` AND project_id = $2`;
      queryParams.push(parseInt(project_id));
    }

    const result = await query(queryText, queryParams);
    const metrics = result.rows[0];

    // Calculate overall score
    const overallScore = metrics.total_assessments > 0 
      ? Math.round(((parseFloat(metrics.avg_vision) + parseFloat(metrics.avg_reality) + 
          parseFloat(metrics.avg_ethics) + parseFloat(metrics.avg_courage)) / 4) * 10) / 10
      : 0;

    // Get trend data (last 6 assessments)
    const trendQuery = `
      SELECT 
        created_at,
        vision_score,
        reality_score,
        ethics_score,
        courage_score,
        project_id
      FROM leadership_assessments 
      WHERE user_id = $1 ${project_id && project_id !== 'all' ? 'AND project_id = $2' : ''}
      ORDER BY created_at DESC 
      LIMIT 6
    `;
    
    const trendResult = await query(trendQuery, queryParams.slice(0, project_id && project_id !== 'all' ? 2 : 1));

    res.json({
      success: true,
      metrics: {
        totalAssessments: parseInt(metrics.total_assessments),
        averageScores: {
          vision: Math.round(parseFloat(metrics.avg_vision || 0) * 10) / 10,
          reality: Math.round(parseFloat(metrics.avg_reality || 0) * 10) / 10,
          ethics: Math.round(parseFloat(metrics.avg_ethics || 0) * 10) / 10,
          courage: Math.round(parseFloat(metrics.avg_courage || 0) * 10) / 10,
          overall: overallScore
        },
        timeline: {
          latestAssessment: metrics.latest_assessment,
          firstAssessment: metrics.first_assessment
        },
        trend: trendResult.rows.reverse() // Show chronologically
      }
    });

  } catch (error) {
    console.error('❌ Error getting leadership metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve leadership metrics'
    });
  }
});

/**
 * Delete a leadership assessment
 * DELETE /api/leadership/assessments/:id
 */
const deleteLeadershipAssessment = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const assessmentId = parseInt(req.params.id);

    if (isNaN(assessmentId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid assessment ID'
      });
    }

    // Check if assessment exists and user has permission to delete
    const checkQuery = `
      SELECT id, user_id FROM leadership_assessments 
      WHERE id = $1 AND user_id = $2
    `;
    
    const checkResult = await query(checkQuery, [assessmentId, userId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found or access denied'
      });
    }

    // Delete the assessment
    await query('DELETE FROM leadership_assessments WHERE id = $1', [assessmentId]);

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
});

module.exports = {
  getLeadershipAssessments,
  submitLeadershipAssessment,
  getLeadershipAssessmentById,
  getLeadershipMetrics,
  deleteLeadershipAssessment
};