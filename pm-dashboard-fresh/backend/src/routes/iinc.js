// routes/iinc.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { query } = require('../config/database');

console.log('🔗 Setting up I, Inc. routes...');

// Get all I, Inc. form templates
router.get('/templates', auth, async (req, res) => {
  try {
    console.log('📋 Fetching I, Inc. templates for user:', req.user.name);
    
    const result = await query(`
      SELECT id, template_name, module_name, description, form_structure, display_order
      FROM iinc_form_templates 
      WHERE is_active = true 
      ORDER BY display_order ASC
    `);
    
    console.log('✅ Found', result.rows.length, 'I, Inc. templates');
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error fetching I Inc templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch form templates'
    });
  }
});

// Get specific template by ID
router.get('/templates/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📋 Fetching I, Inc. template:', id, 'for user:', req.user.name);
    
    const result = await query(`
      SELECT id, template_name, module_name, description, form_structure, display_order
      FROM iinc_form_templates 
      WHERE id = $1 AND is_active = true
    `, [id]);
    
    if (result.rows.length === 0) {
      console.log('❌ Template not found:', id);
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }
    
    console.log('✅ Found template:', result.rows[0].template_name);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error fetching I Inc template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch template'
    });
  }
});

// Submit or update form submission
router.post('/submissions', auth, async (req, res) => {
  try {
    const { template_id, submission_data, notes, status = 'submitted' } = req.body;
    const user_id = req.user.id;
    
    console.log('📝 I, Inc. submission from user:', req.user.name, 'template:', template_id);
    
    // Validate required fields
    if (!template_id || !submission_data) {
      return res.status(400).json({
        success: false,
        error: 'Template ID and submission data are required'
      });
    }
    
    // Check if user already has a submission for this template
    const existingSubmission = await query(`
      SELECT id FROM iinc_form_submissions 
      WHERE user_id = $1 AND template_id = $2
    `, [user_id, template_id]);
    
    let result;
    
    if (existingSubmission.rows.length > 0) {
      // Update existing submission
      console.log('🔄 Updating existing I, Inc. submission:', existingSubmission.rows[0].id);
      result = await query(`
        UPDATE iinc_form_submissions 
        SET submission_data = $1, notes = $2, status = $3, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $4 AND template_id = $5
        RETURNING *
      `, [JSON.stringify(submission_data), notes, status, user_id, template_id]);
    } else {
      // Create new submission
      console.log('➕ Creating new I, Inc. submission');
      result = await query(`
        INSERT INTO iinc_form_submissions (user_id, template_id, submission_data, notes, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [user_id, template_id, JSON.stringify(submission_data), notes, status]);
    }
    
    console.log('✅ I, Inc. submission successful');
    
    res.json({
      success: true,
      data: result.rows[0],
      message: existingSubmission.rows.length > 0 ? 'Submission updated successfully' : 'Submission created successfully'
    });
  } catch (error) {
    console.error('❌ Error submitting I Inc form:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit form'
    });
  }
});

// Get user's submissions
router.get('/submissions', auth, async (req, res) => {
  try {
    const user_id = req.user.id;
    console.log('📋 Fetching I, Inc. submissions for user:', req.user.name);
    
    const result = await query(`
      SELECT 
        s.id, s.template_id, s.submission_data, s.status, s.notes,
        s.submission_date, s.updated_at, s.reviewed_by, s.reviewed_at, s.review_notes,
        t.template_name, t.module_name, t.description
      FROM iinc_form_submissions s
      JOIN iinc_form_templates t ON s.template_id = t.id
      WHERE s.user_id = $1
      ORDER BY s.updated_at DESC
    `, [user_id]);
    
    console.log('✅ Found', result.rows.length, 'I, Inc. submissions for user:', req.user.name);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error fetching user submissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch submissions'
    });
  }
});

// Get specific submission by ID
router.get('/submissions/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    
    console.log('📋 Fetching I, Inc. submission:', id, 'for user:', req.user.name);
    
    let query_sql = `
      SELECT 
        s.id, s.user_id, s.template_id, s.submission_data, s.status, s.notes,
        s.submission_date, s.updated_at, s.reviewed_by, s.reviewed_at, s.review_notes,
        t.template_name, t.module_name, t.description,
        u.name as user_name, u.email as user_email
      FROM iinc_form_submissions s
      JOIN iinc_form_templates t ON s.template_id = t.id
      JOIN users u ON s.user_id = u.id
      WHERE s.id = $1
    `;
    
    let query_params = [id];
    
    // If not an executive leader, only show user's own submissions
    if (req.user.role !== 'executive_leader' && req.user.role !== 'Executive Leader' && req.user.role !== 'admin') {
      query_sql += ` AND s.user_id = $2`;
      query_params.push(user_id);
      console.log('🔒 Restricting to user\'s own submissions');
    } else {
      console.log('👑 Executive access - can view all submissions');
    }
    
    const result = await query(query_sql, query_params);
    
    if (result.rows.length === 0) {
      console.log('❌ Submission not found or access denied:', id);
      return res.status(404).json({
        success: false,
        error: 'Submission not found'
      });
    }
    
    console.log('✅ Found submission:', result.rows[0].template_name);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error fetching submission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch submission'
    });
  }
});

// Get all team submissions (for executive leaders)
router.get('/team-submissions', auth, async (req, res) => {
  try {
    // Check if user is executive leader
    if (req.user.role !== 'executive_leader' && req.user.role !== 'Executive Leader' && req.user.role !== 'admin') {
      console.log('🚫 Access denied for user:', req.user.name, 'role:', req.user.role);
      return res.status(403).json({
        success: false,
        error: 'Access denied. Executive leader role required.'
      });
    }
    
    console.log('👑 Fetching team I, Inc. submissions for executive:', req.user.name);
    
    const result = await query(`
      SELECT 
        s.id, s.user_id, s.template_id, s.submission_data, s.status, s.notes,
        s.submission_date, s.updated_at, s.reviewed_by, s.reviewed_at, s.review_notes,
        t.template_name, t.module_name, t.description,
        u.name as user_name, u.email as user_email, u.title, u.department
      FROM iinc_form_submissions s
      JOIN iinc_form_templates t ON s.template_id = t.id
      JOIN users u ON s.user_id = u.id
      WHERE s.status IN ('submitted', 'reviewed')
      ORDER BY u.name ASC, s.submission_date DESC
    `);
    
    console.log('✅ Found', result.rows.length, 'team submissions');
    
    // Group submissions by user
    const groupedSubmissions = result.rows.reduce((acc, submission) => {
      const userId = submission.user_id;
      if (!acc[userId]) {
        acc[userId] = {
          user: {
            id: submission.user_id,
            name: submission.user_name,
            email: submission.user_email,
            title: submission.title,
            department: submission.department
          },
          submissions: []
        };
      }
      acc[userId].submissions.push(submission);
      return acc;
    }, {});
    
    const groupedArray = Object.values(groupedSubmissions);
    console.log('📊 Grouped into', groupedArray.length, 'team members');
    
    res.json({
      success: true,
      data: groupedArray
    });
  } catch (error) {
    console.error('❌ Error fetching team submissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch team submissions'
    });
  }
});

// Add review to submission (for executive leaders)
router.post('/submissions/:id/review', auth, async (req, res) => {
  try {
    // Check if user is executive leader
    if (req.user.role !== 'executive_leader' && req.user.role !== 'Executive Leader' && req.user.role !== 'admin') {
      console.log('🚫 Review access denied for user:', req.user.name, 'role:', req.user.role);
      return res.status(403).json({
        success: false,
        error: 'Access denied. Executive leader role required.'
      });
    }
    
    const { id } = req.params;
    const { review_notes } = req.body;
    const reviewed_by = req.user.id;
    
    console.log('📝 Adding review to submission:', id, 'by executive:', req.user.name);
    
    if (!review_notes || !review_notes.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Review notes are required'
      });
    }
    
    const result = await query(`
      UPDATE iinc_form_submissions 
      SET reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP, review_notes = $2, status = 'reviewed'
      WHERE id = $3
      RETURNING *
    `, [reviewed_by, review_notes.trim(), id]);
    
    if (result.rows.length === 0) {
      console.log('❌ Submission not found for review:', id);
      return res.status(404).json({
        success: false,
        error: 'Submission not found'
      });
    }
    
    console.log('✅ Review added successfully to submission:', id);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Review added successfully'
    });
  } catch (error) {
    console.error('❌ Error adding review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add review'
    });
  }
});

// Create reflection entry (future enhancement)
router.post('/reflections', auth, async (req, res) => {
  try {
    const { template_id, reflection_type, title, content, mood_rating, progress_rating, tags = [], is_private = false } = req.body;
    const user_id = req.user.id;
    
    console.log('💭 Creating I, Inc. reflection for user:', req.user.name);
    
    if (!reflection_type || !title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Reflection type, title, and content are required'
      });
    }
    
    const result = await query(`
      INSERT INTO iinc_reflections (
        user_id, template_id, reflection_type, title, content, 
        mood_rating, progress_rating, tags, is_private
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [user_id, template_id, reflection_type, title, content, mood_rating, progress_rating, JSON.stringify(tags), is_private]);
    
    console.log('✅ Reflection created successfully');
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Reflection created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating reflection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create reflection'
    });
  }
});

// Get user's reflections (future enhancement)
router.get('/reflections', auth, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { type } = req.query;
    
    console.log('💭 Fetching I, Inc. reflections for user:', req.user.name);
    
    let query_sql = `
      SELECT 
        r.id, r.template_id, r.reflection_type, r.title, r.content,
        r.mood_rating, r.progress_rating, r.tags, r.is_private, r.created_at,
        t.template_name, t.module_name
      FROM iinc_reflections r
      LEFT JOIN iinc_form_templates t ON r.template_id = t.id
      WHERE r.user_id = $1
    `;
    
    let query_params = [user_id];
    
    if (type) {
      query_sql += ` AND r.reflection_type = $2`;
      query_params.push(type);
    }
    
    query_sql += ` ORDER BY r.created_at DESC`;
    
    const result = await query(query_sql, query_params);
    
    console.log('✅ Found', result.rows.length, 'reflections');
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error fetching reflections:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reflections'
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  console.log('🏥 I, Inc. health check');
  res.json({
    success: true,
    message: 'I Inc service is healthy',
    timestamp: new Date().toISOString(),
    availableRoutes: [
      'GET /api/iinc/templates',
      'GET /api/iinc/templates/:id',
      'POST /api/iinc/submissions',
      'GET /api/iinc/submissions',
      'GET /api/iinc/submissions/:id',
      'GET /api/iinc/team-submissions (executives only)',
      'POST /api/iinc/submissions/:id/review (executives only)',
      'POST /api/iinc/reflections',
      'GET /api/iinc/reflections',
      'GET /api/iinc/health'
    ]
  });
});

// Test endpoint for debugging
router.get('/test', (req, res) => {
  console.log('🧪 I, Inc. test endpoint');
  res.json({
    success: true,
    message: 'I Inc routes are working!',
    timestamp: new Date().toISOString(),
    user: req.headers.authorization ? 'Authenticated' : 'Not authenticated'
  });
});

console.log('✅ I, Inc. routes setup complete');

module.exports = router;