const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireProjectAccess } = require('../middleware/rbac');
const projectController = require('../controllers/projectController');
const { asyncHandler } = require('../middleware/errorHandler');
const {
  getAllProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addTeamMember,
  removeTeamMember,
  addComment,
  getComments,
  updateComment,
  deleteComment
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

// Team management
router.post('/:id/team', auth, addTeamMember);
router.delete('/:id/team/:userId', auth, removeTeamMember);

// Comment routes
router.get('/:id/comments', auth, getComments);
router.post('/:id/comments', auth, addComment);
router.put('/:id/comments/:commentId', auth, updateComment);
router.delete('/:id/comments/:commentId', auth, deleteComment);

// TEAM MANAGEMENT ROUTES
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
  // ADD THIS ROUTE FOR TEAM MEMBER SELECTION
  router.get('/users/available',
  auth,
  asyncHandler(projectController.getAllUsers)
  );

module.exports = router;