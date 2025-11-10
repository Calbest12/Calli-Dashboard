// backend/src/routes/iincRoutes.js
const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Middleware to ensure authentication
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  next();
};

// Middleware to ensure executive access for viewing others' data
const requireExecutiveForOthers = (req, res, next) => {
  const { user_id } = req.params;
  
  // Users can always access their own data
  if (parseInt(user_id) === req.user.id) {
    return next();
  }
  
  // Executive Leaders can access anyone's data
  if (req.user.role === 'Executive Leader') {
    return next();
  }
  
  return res.status(403).json({ 
    success: false, 
    error: 'Access denied. Only Executive Leaders can view other users\' I, Inc. assessments.' 
  });
};

// Database initialization - create tables if they don't exist
const initializeTables = async () => {
  try {
    // I, Inc. responses table
    await pool.query(`
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

    // I, Inc. submissions history table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS iinc_submissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        responses JSONB NOT NULL DEFAULT '{}',
        focus_area VARCHAR(50),
        completion_percentage INTEGER DEFAULT 0,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_iinc_responses_user_id ON iinc_responses(user_id);
      CREATE INDEX IF NOT EXISTS idx_iinc_responses_module ON iinc_responses(module_key);
      CREATE INDEX IF NOT EXISTS idx_iinc_submissions_user_id ON iinc_submissions(user_id);
    `);

    console.log('✅ I, Inc. database tables initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing I, Inc. tables:', error);
  }
};

// Initialize tables on module load
initializeTables();

// GET /api/career/iinc-responses/:user_id - Get latest responses for a user
router.get('/iinc-responses/:user_id', requireAuth, requireExecutiveForOthers, async (req, res) => {
  try {
    const { user_id } = req.params;

    console.log(`📖 Loading I, Inc. responses for user ${user_id} (requested by ${req.user.id})`);

    // Get the latest responses for each module/section combination
    const result = await pool.query(`
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
    `, [user_id]);

    // Structure the responses by module and section
    const structuredResponses = {};
    result.rows.forEach(row => {
      if (!structuredResponses[row.module_key]) {
        structuredResponses[row.module_key] = {};
      }
      structuredResponses[row.module_key][row.section_key] = row.response_text;
    });

    console.log(`✅ Found responses for ${result.rows.length} sections across ${Object.keys(structuredResponses).length} modules`);

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
});

// GET /api/career/iinc-history/:user_id - Get submission history for a user
router.get('/iinc-history/:user_id', requireAuth, requireExecutiveForOthers, async (req, res) => {
  try {
    const { user_id } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    console.log(`📚 Loading I, Inc. submission history for user ${user_id}`);

    const result = await pool.query(`
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
    `, [user_id, limit]);

    console.log(`✅ Found ${result.rows.length} I, Inc. submissions`);

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        focus_area: row.focus_area,
        completion_percentage: row.completion_percentage,
        submitted_at: row.submitted_at,
        // Don't send full responses in history list for performance
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
});

// POST /api/career/iinc-responses - Save or update a response
router.post('/iinc-responses', requireAuth, async (req, res) => {
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
    const result = await pool.query(`
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
    
    // Check if it's a constraint error
    if (error.code === '23505') { // Unique constraint violation
      // Try updating instead
      try {
        const { user_id, responses, module_key, section_key } = req.body;
        const responseText = responses[module_key]?.[section_key] || '';
        
        const updateResult = await pool.query(`
          UPDATE iinc_responses 
          SET response_text = $1, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $2 AND module_key = $3 AND section_key = $4
          RETURNING id
        `, [responseText, user_id, module_key, section_key]);

        if (updateResult.rows.length > 0) {
          return res.json({
            success: true,
            data: { id: updateResult.rows[0].id }
          });
        }
      } catch (updateError) {
        console.error('❌ Error updating I, Inc. response:', updateError);
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to save I, Inc. response'
    });
  }
});

// POST /api/career/iinc-submit - Submit a complete assessment
router.post('/iinc-submit', requireAuth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

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

    // Calculate completion percentage
    const totalSections = 13; // passion(3) + sweetspot(3) + story(3) + entrepreneurial(4) sections
    let completedSections = 0;

    Object.values(responses).forEach(moduleResponses => {
      if (moduleResponses && typeof moduleResponses === 'object') {
        Object.values(moduleResponses).forEach(response => {
          if (response && response.trim().length > 0) {
            completedSections++;
          }
        });
      }
    });

    const completionPercentage = Math.round((completedSections / totalSections) * 100);

    // Save individual responses
    for (const [moduleKey, moduleResponses] of Object.entries(responses)) {
      if (moduleResponses && typeof moduleResponses === 'object') {
        for (const [sectionKey, responseText] of Object.entries(moduleResponses)) {
          if (responseText && responseText.trim().length > 0) {
            await client.query(`
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
    const submissionResult = await client.query(`
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

    await client.query('COMMIT');

    console.log(`✅ I, Inc. assessment submitted successfully: ${completionPercentage}% complete`);

    res.json({
      success: true,
      data: {
        id: submissionResult.rows[0].id,
        completion_percentage: completionPercentage,
        submitted_at: submissionResult.rows[0].submitted_at
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error submitting I, Inc. assessment:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to submit I, Inc. assessment'
    });
  } finally {
    client.release();
  }
});

// GET /api/career/iinc-summary - Get I, Inc. summary for executives (all users)
router.get('/iinc-summary', requireAuth, async (req, res) => {
  try {
    // Only Executive Leaders can access summary
    if (req.user.role !== 'Executive Leader') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only Executive Leaders can access I, Inc. summary.'
      });
    }

    console.log(`📊 Loading I, Inc. summary for executive ${req.user.id}`);

    // Get latest submission for each user
    const result = await pool.query(`
      WITH latest_submissions AS (
        SELECT DISTINCT ON (user_id)
          user_id,
          id as submission_id,
          focus_area,
          completion_percentage,
          submitted_at
        FROM iinc_submissions
        ORDER BY user_id, submitted_at DESC
      )
      SELECT 
        ls.*,
        u.name as user_name,
        u.role as user_role,
        u.email as user_email
      FROM latest_submissions ls
      JOIN users u ON ls.user_id = u.id
      ORDER BY u.name
    `);

    console.log(`✅ Found I, Inc. data for ${result.rows.length} users`);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('❌ Error loading I, Inc. summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load I, Inc. summary'
    });
  }
});

module.exports = router;