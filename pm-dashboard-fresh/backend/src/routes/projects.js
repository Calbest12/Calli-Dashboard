// FIXED routes/projects.js - Replace your current version with this

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireProjectAccess } = require('../middleware/rbac');
const projectController = require('../controllers/projectController');
const feedbackController = require('../controllers/feedbackController');
const { asyncHandler } = require('../middleware/errorHandler');

// FIXED: Import all necessary functions
const {
  getAllProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addTeamMember,
  removeTeamMember,
  updateTeamMember,  // ADDED
  getProjectTeam,    // ADDED
  addComment,
  getComments,
  updateComment,
  deleteComment,
  getProjectHistory  // ADDED
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
      'DELETE /api/projects/:id/team/:userId',
      'GET /api/projects/:id/comments',
      'POST /api/projects/:id/comments',
      'PUT /api/projects/:id/comments/:commentId',
      'DELETE /api/projects/:id/comments/:commentId'
    ]
  });
});

// Project CRUD routes
router.get('/', auth, getAllProjects);
router.get('/:id', auth, getProject);
router.post('/', auth, createProject);
router.put('/:id', auth, updateProject);
router.delete('/:id', auth, deleteProject);

// ADDED: History route
router.get('/:id/history', auth, getProjectHistory);

// Basic team management routes (these were already working)
router.post('/:id/team', auth, addTeamMember);
router.delete('/:id/team/:userId', auth, removeTeamMember);

// ADDED: Missing team routes
router.get('/:id/team', auth, getProjectTeam);
router.put('/:id/team/:memberId', auth, updateTeamMember);

router.post('/:id/feedback', auth, feedbackController.submitFeedback);
router.get('/:id/feedback', auth, feedbackController.getProjectFeedback);

// Comment routes
router.get('/:id/comments', auth, getComments);
router.post('/:id/comments', auth, addComment);
router.put('/:id/comments/:commentId', auth, updateComment);
router.delete('/:id/comments/:commentId', auth, deleteComment);

// Advanced team management routes with RBAC (keep the existing ones)
router.get('/:id/team',
  requireProjectAccess('view'),
  asyncHandler(projectController.getProjectTeam)
);
router.post('/:id/team',
  requireProjectAccess('manage_team'),
  asyncHandler(projectController.addTeamMember)
);
router.put('/:id/team/:memberId',
  requireProjectAccess('manage_team'),
  asyncHandler(projectController.updateTeamMember)
);
router.delete('/:id/team/:memberId',
  requireProjectAccess('manage_team'),
  asyncHandler(projectController.removeTeamMember)
);

// Route for team member selection
router.get('/users/available',
  auth,
  asyncHandler(projectController.getAllUsers)
);

module.exports = router;