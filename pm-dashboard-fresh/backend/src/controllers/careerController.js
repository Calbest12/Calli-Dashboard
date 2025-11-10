// backend/src/controllers/careerController.js - FIXED VERSION
const { query } = require('../config/database'); // Use existing database.js

const getCareerGoals = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?.id;
    console.log('📋 Getting career goals for user:', userId);
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID is required' 
      });
    }

    const goalsQuery = `
      SELECT 
        g.id,
        g.title,
        g.description,
        g.category,
        g.current_level,
        g.target_level,
        g.priority,
        g.current_progress,
        g.status,
        g.target_date,
        g.completed_date,
        COALESCE(g.resources::text, '[]') as resources,
        g.notes,
        g.created_at,
        g.updated_at,
        COALESCE(
          (
            SELECT json_agg(
                     json_build_object(
                       'new_progress', h.new_progress,
                       'created_at',  h.created_at,
                       'previous_progress', h.previous_progress,
                       'notes', h.notes,
                       'is_initial_note', h.is_initial_note
                     )
                     ORDER BY h.created_at
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
    
    console.log(`✅ Retrieved ${result.rows.length} goals for user ${userId}`);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('❌ Error getting career goals:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get career goals',
      details: error.message
    });
  }
};

const createCareerGoal = async (req, res) => {
  try {
    const userId = req.user?.id;
    console.log('➕ Creating goal for user:', userId);
    console.log('📝 Request data:', req.body);

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'User authentication required' 
      });
    }

    const {
      title,
      description,
      category,
      currentLevel,
      targetLevel,
      priority,
      targetDate,
      notes,
      resources
    } = req.body;

    // Enhanced validation
    if (!title || !title.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Goal title is required' 
      });
    }

    if (!category) {
      return res.status(400).json({ 
        success: false, 
        error: 'Category is required' 
      });
    }

    const currentLevelNum = parseInt(currentLevel);
    const targetLevelNum = parseInt(targetLevel);

    if (!currentLevelNum || currentLevelNum < 1 || currentLevelNum > 10) {
      return res.status(400).json({ 
        success: false, 
        error: 'Current level must be between 1-10' 
      });
    }

    if (!targetLevelNum || targetLevelNum < 1 || targetLevelNum > 10) {
      return res.status(400).json({ 
        success: false, 
        error: 'Target level must be between 1-10' 
      });
    }

    if (targetLevelNum <= currentLevelNum) {
      return res.status(400).json({ 
        success: false, 
        error: 'Target level must be higher than current level' 
      });
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    const goalPriority = priority || 'medium';
    if (!validPriorities.includes(goalPriority)) {
      return res.status(400).json({
        success: false,
        error: 'Priority must be one of: low, medium, high, critical'
      });
    }

    console.log('✨ Creating career goal with validated data');

    const insertQuery = `
      INSERT INTO career_development_goals (
        user_id, title, description, category, current_level, 
        target_level, priority, current_progress, status, target_date, 
        notes, resources, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING 
        id,
        title,
        description,
        category,
        current_level,
        target_level,
        priority,
        current_progress,
        status,
        target_date,
        COALESCE(resources::text, '[]') as resources,
        notes,
        created_at,
        updated_at
    `;

    const values = [
      userId,
      title.trim(),
      description ? description.trim() : null,
      category,
      currentLevelNum,
      targetLevelNum,
      goalPriority,
      0, // initial progress
      'active', // default status
      targetDate || null,
      notes ? notes.trim() : null,
      typeof resources === 'string' ? resources : JSON.stringify(resources || [])
    ];

    const result = await query(insertQuery, values);
    
    console.log('✅ Goal created successfully:', result.rows[0].title);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Goal created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating goal:', error);
    
    // Handle specific database errors
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({
        success: false,
        error: 'A goal with this title already exists'
      });
    }
    
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID or related data'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create goal',
      details: error.message
    });
  }
};

const updateCareerGoal = async (req, res) => {
  try {
    const goalId = parseInt(req.params.id);
    const userId = req.user?.id;
    
    console.log(`✏️ Updating goal ${goalId} for user ${userId}`);

    if (!goalId || isNaN(goalId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid goal ID is required'
      });
    }

    // Check if goal exists and belongs to user
    const existingGoal = await query(
      'SELECT * FROM career_development_goals WHERE id = $1 AND user_id = $2', 
      [goalId, userId]
    );

    if (existingGoal.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found or access denied'
      });
    }

    const {
      title,
      description,
      category,
      currentLevel,
      targetLevel,
      priority,
      targetDate,
      notes,
      resources
    } = req.body;

    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }

    if (!category) {
      return res.status(400).json({
        success: false,
        error: 'Category is required'
      });
    }

    const updateQuery = `
      UPDATE career_development_goals 
      SET title = $1, description = $2, category = $3, current_level = $4, 
          target_level = $5, priority = $6, target_date = $7, notes = $8, 
          resources = $9, updated_at = CURRENT_TIMESTAMP
      WHERE id = $10 AND user_id = $11
      RETURNING *
    `;

    const values = [
      title.trim(),
      description ? description.trim() : null,
      category,
      parseInt(currentLevel),
      parseInt(targetLevel),
      priority || 'medium',
      targetDate || null,
      notes ? notes.trim() : null,
      typeof resources === 'string' ? resources : JSON.stringify(resources || []),
      goalId,
      userId
    ];

    const result = await query(updateQuery, values);
    
    console.log('✅ Goal updated successfully:', result.rows[0].title);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Goal updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating goal:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update goal',
      details: error.message
    });
  }
};

const deleteCareerGoal = async (req, res) => {
  try {
    const goalId = parseInt(req.params.id);
    const userId = req.user?.id;
    
    console.log(`🗑️ Deleting goal ${goalId} for user ${userId}`);

    if (!goalId || isNaN(goalId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid goal ID is required'
      });
    }

    const deleteQuery = `
      DELETE FROM career_development_goals 
      WHERE id = $1 AND user_id = $2
      RETURNING id, title
    `;

    const result = await query(deleteQuery, [goalId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found or access denied'
      });
    }
    
    console.log('✅ Goal deleted successfully:', result.rows[0].title);

    res.json({
      success: true,
      message: 'Goal deleted successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error deleting goal:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete goal',
      details: error.message
    });
  }
};

const updateGoalProgress = async (req, res) => {
  try {
    const goalId = parseInt(req.params.id);
    const userId = req.user?.id;
    const { progress, notes } = req.body;
    
    console.log(`📊 Updating progress for goal ${goalId}: ${progress}%`);

    // Validation
    if (!goalId || isNaN(goalId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid goal ID is required'
      });
    }

    if (progress === undefined || progress < 0 || progress > 100) {
      return res.status(400).json({
        success: false,
        error: 'Progress must be between 0-100'
      });
    }

    // Get current goal info
    const currentGoal = await query(
      'SELECT current_progress, title FROM career_development_goals WHERE id = $1 AND user_id = $2', 
      [goalId, userId]
    );

    if (currentGoal.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found or access denied'
      });
    }

    const previousProgress = currentGoal.rows[0].current_progress || 0;
    const goalTitle = currentGoal.rows[0].title;

    // Update goal progress
    const updateQuery = `
      UPDATE career_development_goals 
      SET current_progress = $1, 
          status = CASE 
            WHEN $1 >= 100 THEN 'completed'
            WHEN $1 > 0 THEN 'active'
            ELSE status
          END,
          completed_date = CASE 
            WHEN $1 >= 100 THEN CURRENT_DATE
            ELSE completed_date
          END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `;

    const updateResult = await query(updateQuery, [progress, goalId, userId]);

    // Try to add progress history entry (if table exists)
    try {
      const historyQuery = `
        INSERT INTO goal_progress_history (goal_id, new_progress, previous_progress, notes, created_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `;
      
      await query(historyQuery, [goalId, progress, previousProgress, notes || null]);
      console.log('📝 Progress history recorded');
    } catch (historyError) {
      console.log('⚠️ Progress history not available:', historyError.message);
    }

    console.log(`✅ Progress updated for "${goalTitle}": ${previousProgress}% → ${progress}%`);

    res.json({
      success: true,
      data: updateResult.rows[0],
      message: `Progress updated: ${previousProgress}% → ${progress}%`,
      previousProgress,
      newProgress: progress
    });

  } catch (error) {
    console.error('❌ Error updating progress:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update progress',
      details: error.message
    });
  }
};

const getGoalProgressHistory = async (req, res) => {
  try {
    const goalId = parseInt(req.params.id);
    const userId = req.user?.id;
    
    console.log(`📈 Getting progress history for goal ${goalId}`);

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
    if (goalCheck.rows[0].user_id !== userId && req.user.role !== 'Executive Leader') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Try to get progress history
    try {
      const historyResult = await query(
        `SELECT id, previous_progress, new_progress, notes, is_initial_note, created_at
         FROM goal_progress_history 
         WHERE goal_id = $1 
         ORDER BY created_at DESC`,
        [goalId]
      );

      res.json({
        success: true,
        data: historyResult.rows,
        goalTitle: goalCheck.rows[0].title
      });

    } catch (historyError) {
      // History table might not exist
      console.log('⚠️ Progress history table not available');
      res.json({
        success: true,
        data: [],
        message: 'Progress history not available',
        goalTitle: goalCheck.rows[0].title
      });
    }

  } catch (error) {
    console.error('❌ Error getting progress history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get progress history',
      details: error.message
    });
  }
};

const getUserCompletedGoals = async (req, res) => {
  try {
    const requestedUserId = req.params.userId ? parseInt(req.params.userId) : req.user?.id;
    
    console.log('🏆 Getting completed goals for user:', requestedUserId);

    // Authorization check
    if (requestedUserId !== req.user?.id && req.user?.role !== 'Executive Leader') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const completedQuery = `
      SELECT *
      FROM career_development_goals 
      WHERE user_id = $1 AND status = 'completed'
      ORDER BY completed_date DESC, updated_at DESC
    `;

    const result = await query(completedQuery, [requestedUserId]);
    
    console.log(`✅ Retrieved ${result.rows.length} completed goals`);

    res.json({
      success: true,
      completedGoals: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('❌ Error getting completed goals:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get completed goals',
      details: error.message
    });
  }
};

const deleteCompletedGoal = async (req, res) => {
  try {
    const goalId = parseInt(req.params.id);
    const userId = req.user?.id;
    
    console.log(`🗑️ Deleting completed goal ${goalId}`);

    const deleteQuery = `
      DELETE FROM career_development_goals 
      WHERE id = $1 AND user_id = $2 AND status = 'completed'
      RETURNING id, title
    `;

    const result = await query(deleteQuery, [goalId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Completed goal not found or access denied'
      });
    }

    console.log('✅ Completed goal deleted:', result.rows[0].title);

    res.json({
      success: true,
      message: 'Completed goal deleted successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error deleting completed goal:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete completed goal',
      details: error.message
    });
  }
};

const getCareerStats = async (req, res) => {
  try {
    const requestedUserId = req.params.userId ? parseInt(req.params.userId) : req.user?.id;
    
    console.log('📊 Getting career statistics for user:', requestedUserId);

    // Authorization check
    if (requestedUserId !== req.user?.id && req.user?.role !== 'Executive Leader') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const statsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'active' OR status IS NULL) as active_goals,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_goals,
        COUNT(*) FILTER (WHERE status = 'paused') as paused_goals,
        COALESCE(AVG(current_progress) FILTER (WHERE status = 'active' OR status IS NULL), 0) as avg_progress,
        COUNT(*) as total_goals,
        COUNT(DISTINCT category) as categories_count,
        MAX(updated_at) as last_updated
      FROM career_development_goals 
      WHERE user_id = $1 AND (status IS NULL OR status != 'cancelled')
    `;

    const result = await query(statsQuery, [requestedUserId]);
    const stats = result.rows[0];

    // Get category breakdown
    const categoryQuery = `
      SELECT 
        category,
        COUNT(*) as count,
        COALESCE(AVG(current_progress), 0) as avg_progress
      FROM career_development_goals 
      WHERE user_id = $1 AND (status IS NULL OR status != 'cancelled')
      GROUP BY category
      ORDER BY count DESC, category
    `;

    const categoryResult = await query(categoryQuery, [requestedUserId]);

    console.log('✅ Statistics calculated');

    res.json({
      success: true,
      data: {
        activeGoals: parseInt(stats.active_goals),
        completedGoals: parseInt(stats.completed_goals),
        pausedGoals: parseInt(stats.paused_goals),
        totalGoals: parseInt(stats.total_goals),
        avgProgress: Math.round(parseFloat(stats.avg_progress)),
        categoriesCount: parseInt(stats.categories_count),
        lastUpdated: stats.last_updated,
        categoryBreakdown: categoryResult.rows.map(row => ({
          category: row.category,
          count: parseInt(row.count),
          avgProgress: Math.round(parseFloat(row.avg_progress))
        }))
      }
    });

  } catch (error) {
    console.error('❌ Error getting career statistics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get career statistics',
      details: error.message
    });
  }
};

module.exports = {
  getCareerGoals,
  createCareerGoal,
  updateCareerGoal,
  deleteCareerGoal,
  updateGoalProgress,
  getGoalProgressHistory,
  getUserCompletedGoals,
  deleteCompletedGoal,
  getCareerStats
};