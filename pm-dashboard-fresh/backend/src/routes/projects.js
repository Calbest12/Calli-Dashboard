// FIXED routes/projects.js - Replace your current version with this

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireProjectAccess } = require('../middleware/rbac');
const projectController = require('../controllers/projectController');
const feedbackController = require('../controllers/feedbackController');
const teamController = require('../controllers/teamController');
const { asyncHandler } = require('../middleware/errorHandler');
const { query } = require('../config/database');

// FIXED: Import all necessary functions
const {
  getAllProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addComment,
  getComments,
  updateComment,
  deleteComment,
  getProjectHistory,  // ADDED
  getProjectAnalytics
} = require('../controllers/projectController');


// Test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Project routes are working!',
    availableRoutes: [
      'GET /api/projects',
      'GET /api/projects/:id',
      'POST /api/projects',
      'PUT /api/projects/:id',
      'DELETE /api/projects/:id',
      'GET /api/projects/:id/history',     // ADDED
      'GET /api/projects/:id/team',        // ADDED
      'POST /api/projects/:id/team',
      'PUT /api/projects/:id/team/:memberId',  // ADDED
      'DELETE /api/projects/:id/team/:memberId',
      'GET /api/projects/:id/comments',
      'POST /api/projects/:id/comments',
      'PUT /api/projects/:id/comments/:commentId',
      'DELETE /api/projects/:id/comments/:commentId'
    ]
  });
});

router.get('/debug-test', (req, res) => {
  console.log('🟢 DEBUG TEST ROUTE HIT');
  res.json({ message: 'Debug route working' });
});

router.get('/users/available', auth, async (req, res) => {
  try {
    console.log(`📡 GET /api/projects/users/available`);

    const usersResult = await query(
      'SELECT id, name, email, role FROM users WHERE id != $1 ORDER BY name',
      [req.user.id]
    );

    console.log(`✅ Found ${usersResult.rows.length} available users`);

    res.json({
      success: true,
      data: usersResult.rows,
      users: usersResult.rows
    });

  } catch (error) {
    console.error('❌ Error getting users:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// Project CRUD routes
router.get('/', auth, getAllProjects);
router.get('/:id', auth, getProject);
router.post('/', auth, createProject);
router.put('/:id', auth, updateProject);
router.delete('/:id', auth, deleteProject);

// ADDED: History route
router.get('/:id/history', auth, getProjectHistory);



// ADDED: Missing team routes
router.get('/:id/team', auth, async (req, res) => {
  try {
    const projectId = req.params.id;
    console.log(`📡 GET /api/projects/${projectId}/team`);

    const teamQuery = `
      SELECT ptm.*, u.name, u.email, u.role as user_role
      FROM project_team_members ptm
      JOIN users u ON ptm.user_id = u.id
      WHERE ptm.project_id = $1
    `;

    const result = await query(teamQuery, [projectId]);
    console.log(`✅ Found ${result.rows.length} team members`);

    res.json({
      success: true,
      team: result.rows,
      data: result.rows
    });

  } catch (error) {
    console.error('❌ Error getting team:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/team', auth, async (req, res) => {
  try {
    const projectId = req.params.id;
    const { id, userId, role } = req.body;
    const memberId = id || userId;

    console.log(`➕ POST /api/projects/${projectId}/team - Adding member ${memberId}`);

    if (!memberId) {
      return res.status(400).json({ success: false, error: 'Member ID required' });
    }

    // Check if user exists
    const userResult = await query('SELECT name, email FROM users WHERE id = $1', [memberId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check if already a member
    const existingResult = await query(
      'SELECT id FROM project_team_members WHERE project_id = $1 AND user_id = $2',
      [projectId, memberId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'User already on team' });
    }

    // Add member
    await query(
      'INSERT INTO project_team_members (project_id, user_id, role_in_project, joined_date, status) VALUES ($1, $2, $3, $4, $5)',
      [projectId, memberId, role || 'Team Member', new Date(), 'active']
    );

    console.log(`✅ Added member ${memberId} to project ${projectId}`);

    res.json({
      success: true,
      message: `${userResult.rows[0].name} added to project`,
      data: { id: memberId, name: userResult.rows[0].name }
    });

  } catch (error) {
    console.error('❌ Error adding member:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/team/:memberId', auth, async (req, res) => {
  try {
    const { id: projectId, memberId } = req.params;
    const { role, skills } = req.body;

    console.log(`📝 PUT /api/projects/${projectId}/team/${memberId}`);

    const updateQuery = `
      UPDATE project_team_members 
      SET role_in_project = $1, skills = $2
      WHERE project_id = $3 AND user_id = $4
      RETURNING *
    `;

    const result = await query(updateQuery, [
      role || 'Team Member',
      JSON.stringify(skills || []),
      projectId,
      memberId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    console.log(`✅ Updated member ${memberId} in project ${projectId}`);

    res.json({
      success: true,
      message: 'Team member updated',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error updating member:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id/team/:memberId', auth, async (req, res) => {
  try {
    const { id: projectId, memberId } = req.params;
    console.log(`🗑️ DELETE /api/projects/${projectId}/team/${memberId}`);

    // Get member name before deleting
    const memberResult = await query(
      'SELECT u.name FROM users u JOIN project_team_members ptm ON u.id = ptm.user_id WHERE ptm.project_id = $1 AND ptm.user_id = $2',
      [projectId, memberId]
    );

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    // Delete member
    await query(
      'DELETE FROM project_team_members WHERE project_id = $1 AND user_id = $2',
      [projectId, memberId]
    );

    console.log(`✅ Removed member ${memberId} from project ${projectId}`);

    res.json({
      success: true,
      message: `${memberResult.rows[0].name} removed from project`
    });

  } catch (error) {
    console.error('❌ Error removing member:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
router.get('/:id/analytics', auth, asyncHandler(projectController.getProjectAnalytics));
router.post('/:id/feedback', auth, feedbackController.submitFeedback);
router.get('/:id/feedback', auth, feedbackController.getProjectFeedback);

// Comment routes
router.get('/:id/comments', auth, getComments);
router.post('/:id/comments', auth, addComment);
router.put('/:id/comments/:commentId', auth, updateComment);
router.delete('/:id/comments/:commentId', auth, deleteComment);

// Route for team member selection


module.exports = router;