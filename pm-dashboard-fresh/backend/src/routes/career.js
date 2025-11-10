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
    
    // Try token authentication first
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      if (!isNaN(token)) {
        try {
          const userResult = await query('SELECT id, name, email, role FROM users WHERE id = $1', [parseInt(token)]);
          if (userResult.rows.length > 0) {
            user = userResult.rows[0];
          }
        } catch (tokenError) {
          console.log('Token auth failed:', tokenError.message);
        }
      }
    }
    
    // Fallback to any available user for development
    if (!user) {
      try {
        const fallbackResult = await query('SELECT id, name, email, role FROM users ORDER BY id LIMIT 1');
        if (fallbackResult.rows.length > 0) {
          user = fallbackResult.rows[0];
          console.log('Using fallback user:', user.name);
        }
      } catch (fallbackError) {
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
    console.error('Auth error:', error);
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
            WHERE h.goal_id = g.id
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
      await query(`
        INSERT INTO goal_progress_history (goal_id, previous_progress, new_progress, notes, created_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `, [goalId, previousProgress, progress, notes || null]);
    } catch (historyError) {
      console.log('Could not save progress history:', historyError.message);
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