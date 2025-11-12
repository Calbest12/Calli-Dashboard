// backend/src/routes/career.js
const express = require('express');
const careerController = require('../controllers/careerController');
const { asyncHandler } = require('../middleware/errorHandler');
const { query } = require('../config/database');

const router = express.Router();

// Simplified authentication middleware
const careerAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let user = null;
    
    console.log('🔍 Career Auth - Headers:', { 
      authorization: authHeader ? 'Bearer ***' : 'none',
      userAgent: req.headers['user-agent']?.substring(0, 50)
    });
    
    // Try token authentication first
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('🎫 Token received:', token.length > 10 ? token.substring(0, 10) + '...' : token);
      
      // Handle both "user_15" and "15" formats
      let userId = null;
      if (token.startsWith('user_')) {
        userId = parseInt(token.substring(5)); // Remove 'user_' prefix
      } else if (!isNaN(token)) {
        userId = parseInt(token);
      }
      
      if (userId && !isNaN(userId)) {
        try {
          const userResult = await query('SELECT id, name, email, role FROM users WHERE id = $1', [userId]);
          if (userResult.rows.length > 0) {
            user = userResult.rows[0];
            console.log('✅ Token auth success:', user.name, 'ID:', user.id);
          } else {
            console.log('❌ Token auth failed: User not found for ID', userId);
          }
        } catch (tokenError) {
          console.log('❌ Token auth error:', tokenError.message);
        }
      } else {
        console.log('❌ Could not extract valid user ID from token:', token);
      }
    } else {
      console.log('❌ No valid authorization header');
    }
    
    // Fallback to any available user for development (with better logging)
    if (!user) {
      console.log('⚠️  Using fallback authentication...');
      try {
        const fallbackResult = await query('SELECT id, name, email, role FROM users ORDER BY id LIMIT 1');
        if (fallbackResult.rows.length > 0) {
          user = fallbackResult.rows[0];
          console.log('🔄 Fallback user:', user.name, 'ID:', user.id);
        }
      } catch (fallbackError) {
        console.log('❌ Fallback failed:', fallbackError.message);
        return res.status(500).json({
          success: false,
          error: 'No users found in system'
        });
      }
    }
    
    if (user) {
      req.user = user;
      next();
    } else {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

// Test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Career routes working!',
    timestamp: new Date().toISOString()
  });
});

// Health check
router.get('/health', careerAuth, async (req, res) => {
  try {
    const timeResult = await query('SELECT NOW() as current_time');
    const userCount = await query('SELECT COUNT(*) as count FROM users');
    const goalCount = await query('SELECT COUNT(*) as count FROM career_development_goals');
    
    res.json({
      success: true,
      database: { connected: true, currentTime: timeResult.rows[0].current_time },
      counts: { users: userCount.rows[0].count, goals: goalCount.rows[0].count },
      auth: { user: req.user.name, userId: req.user.id }
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: 'Health check failed' });
  }
});

// Get goals - supports /goals and /goals/:userId
router.get('/goals/:userId?', careerAuth, asyncHandler(async (req, res) => {
  try {
    const userId = req.params.userId ? parseInt(req.params.userId) : req.user.id;
    
    // Authorization check
    if (userId !== req.user.id && req.user.role !== 'Executive Leader') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    const goalsQuery = `
      SELECT 
        g.id, g.title, g.description, g.category, g.current_level, g.target_level, 
        g.priority, g.current_progress, g.status, g.target_date, g.completed_date,
        COALESCE(g.resources::text, '[]') as resources, g.notes, g.created_at, g.updated_at,
        COALESCE(
          (
            SELECT json_agg(
                     json_build_object(
                       'id', h.id,
                       'previous_progress', h.previous_progress,
                       'new_progress', h.new_progress,
                       'notes', h.notes,
                       'is_initial_note', h.is_initial_note,
                       'created_at', h.created_at
                     )
                     ORDER BY h.created_at DESC
                   )
            FROM goal_progress_history h
            WHERE h.goal_id = g.id AND h.user_id = g.user_id
          ),
          '[]'::json
        ) AS goal_progress_history
      FROM career_development_goals g
      WHERE g.user_id = $1 AND (g.status IS NULL OR g.status != 'cancelled')
      ORDER BY g.created_at DESC
    `;

    const result = await query(goalsQuery, [userId]);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error getting goals:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get goals',
      details: error.message
    });
  }
}));

// Create goal
router.post('/goals', careerAuth, asyncHandler(careerController.createCareerGoal));

// Update goal
router.put('/goals/:id', careerAuth, asyncHandler(careerController.updateCareerGoal));

// Delete goal
router.delete('/goals/:id', careerAuth, asyncHandler(careerController.deleteCareerGoal));

// Update goal progress
router.put('/goals/:id/progress', careerAuth, asyncHandler(async (req, res) => {
  try {
    const goalId = parseInt(req.params.id);
    const { progress, notes } = req.body;
    
    console.log('🎯 Progress update request:', {
      goalId,
      progress,
      notes: notes ? 'Yes (' + notes.length + ' chars)' : 'No'
    });
    
    if (progress === undefined || progress < 0 || progress > 100) {
      return res.status(400).json({
        success: false,
        error: 'Progress must be between 0-100'
      });
    }
    
    const goalCheck = await query(
      'SELECT current_progress, title FROM career_development_goals WHERE id = $1 AND user_id = $2', 
      [goalId, req.user.id]
    );
    
    if (goalCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found'
      });
    }
    
    // Create progress history table if it doesn't exist
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS goal_progress_history (
          id SERIAL PRIMARY KEY,
          goal_id INTEGER REFERENCES career_development_goals(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          previous_progress INTEGER,
          new_progress INTEGER,
          notes TEXT,
          is_initial_note BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (tableError) {
      console.log('Progress history table already exists');
    }
    
    const previousProgress = goalCheck.rows[0].current_progress || 0;
    
    console.log('📊 Progress change:', previousProgress, '→', progress);
    
    // Update progress
    const updateQuery = `
      UPDATE career_development_goals 
      SET current_progress = $1, 
          status = CASE WHEN $1 >= 100 THEN 'completed' ELSE status END,
          completed_date = CASE WHEN $1 >= 100 THEN CURRENT_DATE ELSE completed_date END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `;
    
    const result = await query(updateQuery, [progress, goalId, req.user.id]);
    
    // Add progress history entry
    try {
      const historyInsert = await query(`
        INSERT INTO goal_progress_history (goal_id, user_id, previous_progress, new_progress, notes, created_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        RETURNING id, notes
      `, [goalId, req.user.id, previousProgress, progress, notes || null]);
      
      console.log('✅ Progress history saved:', historyInsert.rows[0]);
    } catch (historyError) {
      console.error('❌ Could not save progress history:', historyError);
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Progress updated successfully'
    });

  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update progress'
    });
  }
}));

// Get progress history
router.get('/goals/:id/progress-history', careerAuth, asyncHandler(async (req, res) => {
  try {
    const goalId = parseInt(req.params.id);
    
    // Check if goal exists and user has access
    const goalCheck = await query(
      'SELECT title, user_id FROM career_development_goals WHERE id = $1', 
      [goalId]
    );
    
    if (goalCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found'
      });
    }
    
    // Authorization check
    if (goalCheck.rows[0].user_id !== req.user.id && req.user.role !== 'Executive Leader') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Get progress history
    try {
      const historyResult = await query(
        'SELECT * FROM goal_progress_history WHERE goal_id = $1 ORDER BY created_at DESC',
        [goalId]
      );
      
      res.json({
        success: true,
        data: historyResult.rows,
        goalTitle: goalCheck.rows[0].title
      });
      
    } catch (historyError) {
      // History table might not exist
      res.json({
        success: true,
        data: [],
        goalTitle: goalCheck.rows[0].title
      });
    }
    
  } catch (error) {
    console.error('Error getting progress history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get progress history'
    });
  }
}));

// Get completed goals
router.get('/completed/:userId?', careerAuth, asyncHandler(async (req, res) => {
  try {
    const userId = req.params.userId ? parseInt(req.params.userId) : req.user.id;
    
    if (userId !== req.user.id && req.user.role !== 'Executive Leader') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const result = await query(
      'SELECT * FROM career_development_goals WHERE user_id = $1 AND status = \'completed\' ORDER BY completed_date DESC',
      [userId]
    );
    
    res.json({
      success: true,
      completedGoals: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get completed goals' });
  }
}));

// Get stats
router.get('/stats/:userId?', careerAuth, asyncHandler(async (req, res) => {
  try {
    const userId = req.params.userId ? parseInt(req.params.userId) : req.user.id;
    
    if (userId !== req.user.id && req.user.role !== 'Executive Leader') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const statsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'active' OR status IS NULL) as active_goals,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_goals,
        COALESCE(AVG(current_progress) FILTER (WHERE status = 'active' OR status IS NULL), 0) as avg_progress,
        COUNT(*) as total_goals
      FROM career_development_goals 
      WHERE user_id = $1 AND (status IS NULL OR status != 'cancelled')
    `;
    
    const result = await query(statsQuery, [userId]);
    const stats = result.rows[0];
    
    res.json({
      success: true,
      data: {
        activeGoals: parseInt(stats.active_goals),
        completedGoals: parseInt(stats.completed_goals), 
        avgProgress: Math.round(parseFloat(stats.avg_progress)),
        totalGoals: parseInt(stats.total_goals)
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
}));

module.exports = router;

// ========== I, INC. ROUTES ADDED TO CAREER.JS ==========
// Note: These should eventually be moved to a separate iincRoutes.js file

// Initialize I, Inc. tables if they don't exist
const initializeIIncTables = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS iinc_responses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        module_key VARCHAR(50) NOT NULL,
        section_key VARCHAR(50) NOT NULL,
        response_text TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, module_key, section_key)
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS iinc_submissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        responses JSONB NOT NULL DEFAULT '{}',
        focus_area VARCHAR(50),
        completion_percentage INTEGER DEFAULT 0,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ I, Inc. database tables initialized');
  } catch (error) {
    console.error('❌ Error initializing I, Inc. tables:', error);
  }
};

// Initialize tables on module load
initializeIIncTables();

// GET /api/career/iinc-responses/:userId - Get latest responses for a user
router.get('/iinc-responses/:userId', careerAuth, asyncHandler(async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // Authorization check
    if (userId !== req.user.id && req.user.role !== 'Executive Leader') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    console.log('📖 Loading I, Inc. responses for user:', userId);

    const result = await query(`
      WITH latest_responses AS (
        SELECT DISTINCT ON (module_key, section_key)
          module_key,
          section_key,
          response_text,
          updated_at
        FROM iinc_responses 
        WHERE user_id = $1
        ORDER BY module_key, section_key, updated_at DESC
      )
      SELECT * FROM latest_responses
      ORDER BY module_key, section_key
    `, [userId]);

    // Structure the responses by module and section
    const structuredResponses = {};
    result.rows.forEach(row => {
      if (!structuredResponses[row.module_key]) {
        structuredResponses[row.module_key] = {};
      }
      structuredResponses[row.module_key][row.section_key] = row.response_text;
    });

    console.log(`✅ Found responses for ${result.rows.length} sections`);

    res.json({
      success: true,
      data: structuredResponses
    });

  } catch (error) {
    console.error('❌ Error loading I, Inc. responses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load I, Inc. responses'
    });
  }
}));

// GET /api/career/iinc-history/:userId - Get submission history for a user
router.get('/iinc-history/:userId', careerAuth, asyncHandler(async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const limit = parseInt(req.query.limit) || 10;

    // Authorization check
    if (userId !== req.user.id && req.user.role !== 'Executive Leader') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    console.log('📚 Loading I, Inc. submission history for user:', userId);

    const result = await query(`
      SELECT 
        id,
        focus_area,
        completion_percentage,
        submitted_at,
        responses
      FROM iinc_submissions 
      WHERE user_id = $1
      ORDER BY submitted_at DESC
      LIMIT $2
    `, [userId, limit]);

    console.log(`✅ Found ${result.rows.length} I, Inc. submissions`);

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        focus_area: row.focus_area,
        completion_percentage: row.completion_percentage,
        submitted_at: row.submitted_at,
        has_responses: Object.keys(row.responses || {}).length > 0
      }))
    });

  } catch (error) {
    console.error('❌ Error loading I, Inc. history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load I, Inc. submission history'
    });
  }
}));

// POST /api/career/iinc-responses - Save or update a response
router.post('/iinc-responses', careerAuth, asyncHandler(async (req, res) => {
  try {
    const { user_id, responses, module_key, section_key } = req.body;

    // Users can only save their own responses
    if (parseInt(user_id) !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only save your own responses'
      });
    }

    if (!module_key || !section_key) {
      return res.status(400).json({
        success: false,
        error: 'Module key and section key are required'
      });
    }

    const responseText = responses[module_key]?.[section_key] || '';

    console.log(`💾 Saving I, Inc. response: user ${user_id}, ${module_key}.${section_key}`);

    // Upsert the response
    const result = await query(`
      INSERT INTO iinc_responses (user_id, module_key, section_key, response_text, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, module_key, section_key) 
      DO UPDATE SET 
        response_text = EXCLUDED.response_text,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, [user_id, module_key, section_key, responseText]);

    console.log(`✅ I, Inc. response saved with ID ${result.rows[0]?.id}`);

    res.json({
      success: true,
      data: { id: result.rows[0]?.id }
    });

  } catch (error) {
    console.error('❌ Error saving I, Inc. response:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save I, Inc. response'
    });
  }
}));

// POST /api/career/iinc-submit - Submit a complete assessment
router.post('/iinc-submit', careerAuth, asyncHandler(async (req, res) => {
  try {
    const { user_id, responses } = req.body;

    // Users can only submit their own assessments
    if (parseInt(user_id) !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only submit your own assessments'
      });
    }

    if (!responses || typeof responses !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Responses are required'
      });
    }

    console.log(`🚀 Submitting I, Inc. assessment for user ${user_id}`);

    const expectedModules = {
            passion: ['skills_knowledge', 'track_record', 'relationships'],
            sweetspot: ['personal_brand', 'value_proposition', 'underserved_need'], 
            story: ['compelling', 'valuable', 'engaging'],
            entrepreneur: ['survive', 'adapt', 'flourish', 'goals']
          };
      
          const totalSections = Object.values(expectedModules).reduce((total, sections) => 
            total + sections.length, 0
          ); // This will be 13: 3+3+3+4
      
          let completedSections = 0;
          Object.entries(expectedModules).forEach(([moduleKey, sections]) => {
            sections.forEach(sectionKey => {
              if (responses[moduleKey] && 
                  responses[moduleKey][sectionKey] && 
                  responses[moduleKey][sectionKey].trim().length > 0) {
                completedSections++;
              }
            });
          });
      
          const completionPercentage = Math.round((completedSections / totalSections) * 100);
      
          console.log(`📊 Calculation Debug:`, {
            totalSections,
            completedSections,
            completionPercentage,
            modules: Object.keys(expectedModules).map(key => ({
              module: key,
              expected: expectedModules[key].length,
              filled: expectedModules[key].filter(section => 
                responses[key] && responses[key][section] && responses[key][section].trim().length > 0
              ).length
            }))
          });

    // Save individual responses
    for (const [moduleKey, moduleResponses] of Object.entries(responses)) {
      if (moduleResponses && typeof moduleResponses === 'object') {
        for (const [sectionKey, responseText] of Object.entries(moduleResponses)) {
          if (responseText && responseText.trim().length > 0) {
            await query(`
              INSERT INTO iinc_responses (user_id, module_key, section_key, response_text, updated_at)
              VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
              ON CONFLICT (user_id, module_key, section_key) 
              DO UPDATE SET 
                response_text = EXCLUDED.response_text,
                updated_at = CURRENT_TIMESTAMP
            `, [user_id, moduleKey, sectionKey, responseText.trim()]);
          }
        }
      }
    }

    // Create submission record
    const submissionResult = await query(`
      INSERT INTO iinc_submissions (
        user_id, 
        responses, 
        focus_area, 
        completion_percentage, 
        submitted_at
      )
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING id, submitted_at
    `, [
      user_id, 
      JSON.stringify(responses), 
      req.body.focus_area || null,
      completionPercentage
    ]);

    console.log(`✅ I, Inc. assessment submitted: ${completionPercentage}% complete`);

    res.json({
      success: true,
      data: {
        id: submissionResult.rows[0].id,
        completion_percentage: completionPercentage,
        submitted_at: submissionResult.rows[0].submitted_at
      }
    });

  } catch (error) {
    console.error('❌ Error submitting I, Inc. assessment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit I, Inc. assessment'
    });
  }
}));

// GET /api/career/iinc-summary - Get I, Inc. summary for executives (TEAM MEMBERS ONLY)
router.get('/iinc-summary', careerAuth, asyncHandler(async (req, res) => {
  try {
    // Only Executive Leaders can access summary
    if (req.user.role !== 'Executive Leader') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only Executive Leaders can access I, Inc. summary.'
      });
    }

    console.log(`📊 Loading I, Inc. summary for executive ${req.user.id}`);

    // Get only team members assigned to this executive with their latest submission data
    const teamMembersResult = await query(`
      SELECT 
        u.id as user_id,
        u.name as user_name,
        u.role as user_role,
        u.email as user_email,
        s.submission_id,
        s.focus_area,
        s.completion_percentage,
        s.submitted_at,
        ta.assigned_at,
        ta.status as assignment_status
      FROM users u
      LEFT JOIN team_assignments ta ON u.id = ta.team_member_id
      LEFT JOIN (
        SELECT DISTINCT ON (user_id)
          user_id,
          id as submission_id,
          focus_area,
          completion_percentage,
          submitted_at
        FROM iinc_submissions
        ORDER BY user_id, submitted_at DESC
      ) s ON u.id = s.user_id
      WHERE ta.executive_id = $1 
        AND ta.status = 'active'
        AND u.role IN ('Team Member', 'Project Manager', 'Developer', 'Frontend Developer', 'Backend Developer', 'Product Manager', 'Business Analyst', 'Team Lead', 'DevOps Engineer')
      ORDER BY u.name
    `, [req.user.id]);

    console.log(`📋 Found ${teamMembersResult.rows.length} team members for executive ${req.user.id}`);
    
    // Transform data to match frontend expectations
    const transformedData = teamMembersResult.rows.map(row => ({
      user_id: row.user_id,
      user_name: row.user_name,
      user_role: row.user_role,
      user_email: row.user_email,
      assigned_at: row.assigned_at,
      assignment_status: row.assignment_status,
      latest_submission: row.submission_id ? {
        submission_id: row.submission_id,
        focus_area: row.focus_area,
        completion_percentage: row.completion_percentage || 0,
        submitted_at: row.submitted_at
      } : null
    }));

    console.log('🔍 Team submission summary:', transformedData.map(user => ({
      name: user.user_name,
      role: user.user_role,
      hasSubmission: !!user.latest_submission,
      completion: user.latest_submission?.completion_percentage || 0
    })));

    res.json({
      success: true,
      data: transformedData
    });

  } catch (error) {
    console.error('❌ Error loading I, Inc. summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load I, Inc. summary'
    });
  }
}));

// GET /api/career/iinc-details/:userId - Get detailed assessment responses and history for a team member
router.get('/iinc-details/:userId', careerAuth, asyncHandler(async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.userId);
    
    console.log(`🔍 [DETAILS REQUEST] User ${req.user.id} (${req.user.role}) requesting details for user ${targetUserId}`);
    
    // Authorization check - executives can only view their team members' details
    if (req.user.role === 'Executive Leader') {
      console.log('👑 Executive Leader requesting team member details...');
      const teamCheck = await query(`
        SELECT u.id, u.name, u.role, u.email, ta.assigned_at
        FROM users u
        JOIN team_assignments ta ON u.id = ta.team_member_id
        WHERE ta.executive_id = $1 AND ta.team_member_id = $2 AND ta.status = 'active'
      `, [req.user.id, targetUserId]);
      
      console.log(`🔍 Team check result:`, teamCheck.rows);
      
      if (teamCheck.rows.length === 0) {
        console.log('❌ Access denied: Not a team member');
        return res.status(403).json({
          success: false,
          error: 'You can only view details for your assigned team members'
        });
      }
      console.log('✅ Access granted: Team member found');
    } else if (req.user.id !== targetUserId) {
      console.log('❌ Access denied: Not own user and not executive');
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    console.log(`📖 Loading detailed I, Inc. data for user ${targetUserId}`);

    // Get user info
    const userResult = await query('SELECT id, name, email, role FROM users WHERE id = $1', [targetUserId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const user = userResult.rows[0];

    // Get all responses
    const responsesResult = await query(`
      SELECT 
        module_key,
        section_key,
        response_text,
        updated_at
      FROM iinc_responses 
      WHERE user_id = $1
      ORDER BY module_key, section_key, updated_at DESC
    `, [targetUserId]);

    // Structure responses by module and section
    const structuredResponses = {};
    responsesResult.rows.forEach(row => {
      if (!structuredResponses[row.module_key]) {
        structuredResponses[row.module_key] = {};
      }
      structuredResponses[row.module_key][row.section_key] = {
        text: row.response_text,
        updated_at: row.updated_at
      };
    });

    // Get submission history
    const historyResult = await query(`
      SELECT 
        id,
        focus_area,
        completion_percentage,
        submitted_at,
        responses as full_responses
      FROM iinc_submissions 
      WHERE user_id = $1
      ORDER BY submitted_at DESC
    `, [targetUserId]);

    console.log(`✅ Found ${responsesResult.rows.length} responses and ${historyResult.rows.length} submissions for user ${user.name}`);

    const responseData = {
      success: true,
      data: {
        user: user,
        current_responses: structuredResponses,
        submission_history: historyResult.rows.map(row => ({
          id: row.id,
          focus_area: row.focus_area,
          completion_percentage: row.completion_percentage,
          submitted_at: row.submitted_at,
          responses: row.full_responses // Full JSON responses from that submission
        })),
        response_count: responsesResult.rows.length,
        submission_count: historyResult.rows.length
      }
    };

    console.log(`📤 Sending response data:`, {
      user: user.name,
      responseCount: responsesResult.rows.length,
      submissionCount: historyResult.rows.length,
      modules: Object.keys(structuredResponses)
    });

    res.json(responseData);

  } catch (error) {
    console.error('❌ Error loading detailed I, Inc. data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load detailed assessment data'
    });
  }
}));

module.exports = router;