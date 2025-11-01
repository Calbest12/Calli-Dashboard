const { query } = require('../config/database');

const getCareerGoals = async (req, res) => {
    try {
      const userId = req.params.userId || req.user?.id;
      
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
          g.current_level as "currentLevel",
          g.target_level as "targetLevel",
          g.priority,
          g.current_progress as "progress",
          g.status,
          g.target_date as "targetDate",
          g.completed_date,
          COALESCE(g.resources::text, '[]') as "resources",
          g.notes,
          g.created_at as "createdAt",
          g.updated_at as "updatedAt",
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
        WHERE g.user_id = $1 AND g.status != 'cancelled'
        ORDER BY g.created_at DESC
      `;
  
      const result = await query(goalsQuery, [userId]);
  
      res.json({
        success: true,
        data: result.rows
      });
  
    } catch (error) {
      console.error('Error getting career goals:', error);
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
      console.log('ðŸ“ Creating goal with data:', req.body);
      console.log('ðŸ‘¤ User ID:', userId);
  
      if (!userId) {
        return res.status(400).json({ 
          success: false, 
          error: 'User ID is required' 
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
  
      if (!title) {
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
  
      if (!targetDate) {
        return res.status(400).json({ 
          success: false, 
          error: 'Target date is required' 
        });
      }
  
      console.log('âœ¨ Creating career goal:', {
        userId,
        title,
        category,
        currentLevel,
        targetLevel,
        targetDate
      });
  
      const insertQuery = `
        INSERT INTO career_development_goals (
          user_id, title, description, category, current_level, 
          target_level, priority, current_progress, status, target_date, notes, resources
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING 
          id,
          title,
          description,
          category,
          current_level as "currentLevel",
          target_level as "targetLevel",
          priority,
          current_progress as "progress",
          status,
          target_date as "targetDate",
          COALESCE(resources::text, '[]') as "resources",
          notes,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;
  
      const values = [
        userId,
        title,
        description || null,
        category,
        currentLevel || 'beginner',
        targetLevel || 'intermediate',
        priority || 'medium',
        0, 
        'active', 
        targetDate,
        notes || null,
        resources ? JSON.stringify(resources) : '[]'
      ];
  
      console.log('ðŸ“ Insert query:', insertQuery);
      console.log('ðŸ“ Values:', values);
  
      const result = await query(insertQuery, values);
      const newGoal = result.rows[0];
  
      if (notes && notes.trim() !== '') {
        try {
          const createTableQuery = `
            CREATE TABLE IF NOT EXISTS goal_progress_history (
              id SERIAL PRIMARY KEY,
              goal_id INTEGER NOT NULL,
              user_id INTEGER NOT NULL,
              previous_progress INTEGER DEFAULT 0,
              new_progress INTEGER NOT NULL,
              notes TEXT,
              is_initial_note BOOLEAN DEFAULT FALSE,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
          `;
          await query(createTableQuery);
  
          const initialNoteQuery = `
            INSERT INTO goal_progress_history (goal_id, user_id, previous_progress, new_progress, notes, is_initial_note)
            VALUES ($1, $2, 0, 0, $3, true)
          `;
          await query(initialNoteQuery, [newGoal.id, userId, notes]);
          console.log('ðŸ“ Initial note stored in progress history');
        } catch (historyError) {
          console.error('âš ï¸ Error storing initial note:', historyError);
        }
      }
  
      res.status(201).json({
        success: true,
        data: newGoal
      });
  
    } catch (error) {
      console.error('âŒ Error creating career goal:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to create career goal',
        details: error.message
      });
    }
  };

const updateCareerGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const updateData = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID is required' 
      });
    }

    console.log('ðŸ”„ Updating career goal:', id, 'for user:', userId);
    console.log('ðŸ“ Update data:', updateData);
    
    const setClause = [];
    const values = [];
    let paramCount = 1;
    
    const fieldMapping = {
      title: 'title',
      description: 'description',
      category: 'category',
      currentLevel: 'current_level',
      current_level: 'current_level',
      targetLevel: 'target_level',
      target_level: 'target_level',
      priority: 'priority',
      progress: 'current_progress',
      current_progress: 'current_progress',
      currentProgress: 'current_progress',
      status: 'status',
      targetDate: 'target_date',
      target_date: 'target_date',
      resources: 'resources',
      notes: 'notes'
    };
    
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && fieldMapping[key]) {
        let value = updateData[key];
        
        if (key === 'resources' && typeof value !== 'string') {
          value = JSON.stringify(value);
        }
        
        setClause.push(`${fieldMapping[key]} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });
    
    if (setClause.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No valid fields to update' 
      });
    }
    
    setClause.push(`updated_at = CURRENT_TIMESTAMP`);
    
    values.push(userId, id);
    
    const updateQuery = `
      UPDATE career_development_goals 
      SET ${setClause.join(', ')} 
      WHERE user_id = $${paramCount} AND id = $${paramCount + 1}
      RETURNING 
        id,
        title,
        description,
        category,
        current_level as "currentLevel",
        target_level as "targetLevel",
        priority,
        current_progress as "progress",
        status,
        target_date as "targetDate",
        COALESCE(resources::text, '[]') as "resources",
        notes,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;
    
    console.log('ðŸ“ Update query:', updateQuery);
    console.log('ðŸ“ Values:', values);
    
    const result = await query(updateQuery, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Goal not found or access denied' 
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('âŒ Error updating career goal:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

const deleteCareerGoal = async (req, res) => {
  try {
    const goalId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID is required' 
      });
    }

    console.log('ðŸ—‘ï¸ Deleting career goal:', goalId, 'for user:', userId);

    const deleteQuery = 'DELETE FROM career_development_goals WHERE id = $1 AND user_id = $2 RETURNING id';
    const result = await query(deleteQuery, [goalId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Goal not found or access denied' 
      });
    }

    res.json({
      success: true,
      message: 'Goal deleted successfully'
    });

  } catch (error) {
    console.error('âŒ Error deleting career goal:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete career goal' 
    });
  }
};

const updateGoalProgress = async (req, res) => {
  try {
    const goalId = req.params.id;
    const userId = req.user?.id;
    const { progress, notes } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID is required' 
      });
    }

    if (progress < 0 || progress > 100) {
      return res.status(400).json({ 
        success: false, 
        error: 'Progress must be between 0 and 100' 
      });
    }

    console.log('ðŸ“ˆ Updating progress for goal:', goalId, 'to:', progress + '%');

    const checkQuery = `
      SELECT id, title, category, target_level, current_progress
      FROM career_development_goals 
      WHERE id = $1 AND user_id = $2
    `;
    const checkResult = await query(checkQuery, [goalId, userId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Goal not found or access denied' 
      });
    }

    const goal = checkResult.rows[0];
    const previousProgress = goal.current_progress || 0;
    const newStatus = progress === 100 ? 'completed' : 'active';
    const completedDate = progress === 100 ? new Date().toISOString().split('T')[0] : null;

    try {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS goal_progress_history (
          id SERIAL PRIMARY KEY,
          goal_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          previous_progress INTEGER DEFAULT 0,
          new_progress INTEGER NOT NULL,
          notes TEXT,
          is_initial_note BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      await query(createTableQuery);

      const historyQuery = `
        INSERT INTO goal_progress_history (goal_id, user_id, previous_progress, new_progress, notes, is_initial_note)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      await query(historyQuery, [goalId, userId, previousProgress, progress, notes, false]);
      console.log('ðŸ“ Progress history saved');
    } catch (historyError) {
      console.error('âš ï¸ Error saving progress history:', historyError);
    }

    const updateQuery = `
      UPDATE career_development_goals 
      SET 
        current_progress = $1,
        status = $2,
        notes = COALESCE($3, notes),
        completed_date = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 AND user_id = $6
      RETURNING 
        id,
        title,
        description,
        category,
        current_level as "currentLevel",
        target_level as "targetLevel",
        priority,
        current_progress as "progress",
        status,
        target_date as "targetDate",
        COALESCE(resources::text, '[]') as "resources",
        notes,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const result = await query(updateQuery, [progress, newStatus, notes, completedDate, goalId, userId]);

    if (progress === 100) {
      try {
        const tableExistsQuery = `
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'career_milestones'
          )
        `;
        const tableCheck = await query(tableExistsQuery);
        
        if (tableCheck.rows[0].exists) {
          const milestoneQuery = `
            INSERT INTO career_milestones (
              user_id, goal_id, title, description, milestone_type, skill_category, date_completed
            ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
            ON CONFLICT (user_id, goal_id) DO UPDATE SET
              title = EXCLUDED.title,
              description = EXCLUDED.description,
              date_completed = EXCLUDED.date_completed
          `;

          await query(milestoneQuery, [
            userId,
            goalId, 
            `Completed: ${goal.title}`,
            `Successfully achieved ${goal.target_level} level in ${goal.category}`,
            'skill_milestone',
            goal.category
          ]);

          console.log('ðŸ† Milestone created for completed goal:', goal.title);
        } else {
          console.log('âš ï¸ career_milestones table does not exist, skipping milestone creation');
        }
      } catch (milestoneError) {
        console.error('âš ï¸ Error creating milestone:', milestoneError);
      }
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('âŒ Error updating goal progress:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update goal progress' 
    });
  }
};

const getUserCompletedGoals = async (req, res) => {
    try {
      const userId = req.params.userId || req.user?.id;
      
      if (!userId) {
        return res.status(400).json({ 
          success: false, 
          error: 'User ID is required' 
        });
      }
  
      console.log('ðŸ† Getting completed goals for user:', userId);
  
      const tableExistsQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'career_milestones'
        )
      `;
      const tableCheck = await query(tableExistsQuery);
      
      let completedGoalsQuery;
      
      if (tableCheck.rows[0].exists) {
        completedGoalsQuery = `
          SELECT 
            id,
            title,
            description,
            milestone_type as "completedType",
            skill_category as "skillCategory",
            date_completed as "dateCompleted",
            evidence_url as "evidenceUrl",
            created_at as "createdAt",
            'milestone' as type
          FROM career_milestones 
          WHERE user_id = $1 
          
          UNION ALL
          
          SELECT 
            g.id,
            g.title,
            g.description,
            'completed_goal' as "completedType",
            g.category as "skillCategory",
            COALESCE(g.completed_date, g.updated_at::date) as "dateCompleted",
            null as "evidenceUrl",
            g.created_at as "createdAt",
            'completed_goal' as type
          FROM career_development_goals g
          WHERE g.user_id = $1 AND g.status = 'completed'
          AND NOT EXISTS (
            SELECT 1 FROM career_milestones m 
            WHERE m.user_id = g.user_id 
            AND m.title = CONCAT('Completed: ', g.title)
            AND m.milestone_type = 'skill_milestone'
          )
          
          ORDER BY "dateCompleted" DESC
        `;
      } else {
        completedGoalsQuery = `
          SELECT 
            id,
            title,
            description,
            'completed_goal' as "completedType",
            category as "skillCategory",
            COALESCE(completed_date, updated_at::date) as "dateCompleted",
            null as "evidenceUrl",
            created_at as "createdAt",
            'completed_goal' as type
          FROM career_development_goals 
          WHERE user_id = $1 AND status = 'completed'
          ORDER BY "dateCompleted" DESC
        `;
      }
  
      const result = await query(completedGoalsQuery, [userId]);
  
      res.json({
        success: true,
        data: result.rows
      });
  
    } catch (error) {
      console.error('âŒ Error getting completed goals:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get completed goals',
        details: error.message
      });
    }
  };

const getCareerStats = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?.id;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID is required' 
      });
    }

    console.log('ðŸ“Š Getting career stats for user:', userId);

    const goalsStatsQuery = `
      SELECT 
        COUNT(*) as total_goals,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_goals,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_goals,
        COALESCE(AVG(CASE WHEN status = 'active' THEN current_progress END), 0) as avg_progress
      FROM career_development_goals 
      WHERE user_id = $1 AND status != 'cancelled'
    `;

    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'career_milestones'
      )
    `;
    const tableCheck = await query(tableExistsQuery);
    
    let completedQuery;
    if (tableCheck.rows[0].exists) {
      completedQuery = `
        SELECT 
          (SELECT COUNT(*) FROM career_milestones WHERE user_id = $1) +
          (SELECT COUNT(*) FROM career_development_goals WHERE user_id = $1 AND status = 'completed') as total_completed
      `;
    } else {
      completedQuery = `
        SELECT 
          (SELECT COUNT(*) FROM career_development_goals WHERE user_id = $1 AND status = 'completed') as total_completed
      `;
    }

    const [goalsResult, completedResult] = await Promise.all([
      query(goalsStatsQuery, [userId]),
      query(completedQuery, [userId])
    ]);

    const stats = {
      totalGoals: parseInt(goalsResult.rows[0].total_goals),
      activeGoals: parseInt(goalsResult.rows[0].active_goals),
      completedGoals: parseInt(goalsResult.rows[0].completed_goals),
      avgProgress: Math.round(parseFloat(goalsResult.rows[0].avg_progress)),
      totalCompleted: parseInt(completedResult.rows[0].total_completed),
      overview: {
        activeGoals: parseInt(goalsResult.rows[0].active_goals),
        completedGoals: parseInt(goalsResult.rows[0].completed_goals),
        overallProgress: Math.round(parseFloat(goalsResult.rows[0].avg_progress))
      }
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('âŒ Error getting career stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get career statistics',
      details: error.message
    });
  }
};

const getGoalProgressHistory = async (req, res) => {
    try {
      const goalId = req.params.id;
      const userId = req.user?.id;
  
      if (!userId) {
        return res.status(400).json({ 
          success: false, 
          error: 'User ID is required' 
        });
      }
  
      console.log('ðŸ“ˆ Getting progress history for goal:', goalId, 'user:', userId);
  
      const tableExistsQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'goal_progress_history'
        )
      `;
      const tableCheck = await query(tableExistsQuery);
      
      if (!tableCheck.rows[0].exists) {
        return res.json({
          success: true,
          data: []
        });
      }
  
      const historyQuery = `
        SELECT 
          id,
          goal_id as "goalId",
          previous_progress as "previousProgress",
          new_progress as "newProgress",
          notes,
          is_initial_note as "isInitialNote",
          created_at,
          updated_at
        FROM goal_progress_history 
        WHERE goal_id = $1 AND user_id = $2
        ORDER BY created_at ASC
      `;
  
      const result = await query(historyQuery, [goalId, userId]);
  
      res.json({
        success: true,
        data: result.rows
      });
  
    } catch (error) {
      console.error('âŒ Error getting goal progress history:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get progress history',
        data: []
      });
    }
  };

const deleteCompletedGoal = async (req, res) => {
    try {
      const goalId = req.params.id;
      const userId = req.user?.id;
  
      if (!userId) {
        return res.status(400).json({ 
          success: false, 
          error: 'User ID is required' 
        });
      }
  
      console.log('ðŸ—‘ï¸ Deleting completed goal:', goalId, 'for user:', userId);
  
      const milestoneDeleteQuery = `
        DELETE FROM career_milestones 
        WHERE id = $1 AND user_id = $2 
        RETURNING id, title, milestone_type
      `;
      
      const milestoneResult = await query(milestoneDeleteQuery, [goalId, userId]);
      
      if (milestoneResult.rows.length > 0) {
        res.json({
          success: true,
          message: 'Completed goal deleted successfully',
          deletedFrom: 'milestones'
        });
      } else {
        const goalDeleteQuery = `
          UPDATE career_development_goals 
          SET status = 'active', current_progress = 99
          WHERE id = $1 AND user_id = $2 AND status = 'completed'
          RETURNING id, title
        `;
        
        const goalResult = await query(goalDeleteQuery, [goalId, userId]);
        
        if (goalResult.rows.length > 0) {
          res.json({
            success: true,
            message: 'Completed goal deleted (goal reverted to 99%)',
            deletedFrom: 'completed_goal'
          });
        } else {
          res.status(404).json({ 
            success: false, 
            error: 'Completed goal not found or access denied' 
          });
        }
      }
  
    } catch (error) {
      console.error('âŒ Error deleting completed goal:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to delete completed goal' 
      });
    }
  };

  module.exports = {
    getCareerGoals,
    createCareerGoal,
    updateCareerGoal,
    deleteCareerGoal,
    updateGoalProgress,
    getUserCompletedGoals, 
    getCareerStats,
    getGoalProgressHistory,
    deleteCompletedGoal      
  };