const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireExecutiveLeader } = require('../middleware/rbac');
const teamController = require('../controllers/teamController');
const { asyncHandler } = require('../middleware/errorHandler');

// Apply authentication to all routes
router.use(auth);

// ALL TEAM MANAGEMENT ROUTES REQUIRE EXECUTIVE LEADER ROLE

// Get all team members - ONLY Executive Leaders
router.get('/', 
  requireExecutiveLeader(),
  asyncHandler(teamController.getAllTeamMembers)
);

// Get executive leader's team
router.get('/my-team', 
  requireExecutiveLeader(),
  asyncHandler(teamController.getExecutiveTeam)
);

// Get available users to add to team
router.get('/available', 
  requireExecutiveLeader(),
  asyncHandler(teamController.getAvailableTeamMembers)
);

// Add user to executive team
router.post('/members', 
  requireExecutiveLeader(),
  asyncHandler(teamController.addExecutiveTeamMember)
);

// Get specific team member details
router.get('/members/:userId', 
  requireExecutiveLeader(),
  asyncHandler(teamController.getExecutiveTeamMemberDetails)
);

// Update team member (notes, etc.)
router.put('/members/:userId', 
  requireExecutiveLeader(),
  asyncHandler(teamController.updateExecutiveTeamMember)
);

// Remove team member from executive team
router.delete('/members/:userId', 
  requireExecutiveLeader(),
  asyncHandler(teamController.removeExecutiveTeamMember)
);

module.exports = router;