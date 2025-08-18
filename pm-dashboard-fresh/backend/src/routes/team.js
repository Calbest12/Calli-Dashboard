const express = require('express');
const teamController = require('../controllers/teamController');
const { asyncHandler } = require('../middleware/errorHandler');
const router = express.Router();

// Team management routes for projects
// GET /api/projects/:projectId/team - Get all team members for a project
router.get('/:projectId/team', asyncHandler(teamController.getProjectTeam));

// POST /api/projects/:projectId/team - Add a team member to a project
router.post('/:projectId/team', asyncHandler(teamController.addTeamMember));

// PUT /api/projects/:projectId/team/:memberId - Update a team member
router.put('/:projectId/team/:memberId', asyncHandler(teamController.updateTeamMember));

// DELETE /api/projects/:projectId/team/:memberId - Remove a team member from a project
router.delete('/:projectId/team/:memberId', asyncHandler(teamController.removeTeamMember));

module.exports = router;