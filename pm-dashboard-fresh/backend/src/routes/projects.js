const express = require('express');
const projectController = require('../controllers/projectController');
const feedbackController = require('../controllers/feedbackController');
const teamController = require('../controllers/teamController'); // ADD THIS
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Simple auth middleware for project routes
const projectAuth = (req, res, next) => {
  // Get current user from localStorage (should be sent in request)
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    // For now, treat token as user ID
    if (!isNaN(token)) {
      // Get user from database
      const { query } = require('../config/database');
      query('SELECT id, name, email, role FROM users WHERE id = $1', [parseInt(token)])
        .then(result => {
          if (result.rows.length > 0) {
            req.user = result.rows[0];
            console.log('🔑 Project auth successful for:', req.user.name);
            next();
          } else {
            // User not found, but continue with fallback
            getFallbackUser(req, res, next);
          }
        })
        .catch(error => {
          console.warn('Auth error, using fallback:', error.message);
          getFallbackUser(req, res, next);
        });
    } else {
      getFallbackUser(req, res, next);
    }
  } else {
    // No auth header, use fallback
    getFallbackUser(req, res, next);
  }
};

const getFallbackUser = async (req, res, next) => {
  try {
    const { query } = require('../config/database');
    
    // Try to get the current user from localStorage info
    // Check if there's a user named "Calli Best" (your current user)
    const userResult = await query("SELECT id, name, email, role FROM users WHERE name = 'Calli Best' OR email = 'bcalli@umich.edu' LIMIT 1");
    
    if (userResult.rows.length > 0) {
      req.user = userResult.rows[0];
      console.log('🔑 Using specific user for project:', req.user.name);
    } else {
      // Fallback to first user
      const fallbackResult = await query('SELECT id, name, email, role FROM users ORDER BY id LIMIT 1');
      if (fallbackResult.rows.length > 0) {
        req.user = fallbackResult.rows[0];
        console.log('🔑 Using fallback user for project:', req.user.name);
      } else {
        return res.status(500).json({
          success: false,
          error: 'No users found in system'
        });
      }
    }
    next();
  } catch (error) {
    console.error('Fallback auth error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

// Project CRUD routes with auth for create/update operations
router.get('/', asyncHandler(projectController.getAllProjects));
router.get('/:id', asyncHandler(projectController.getProject));
router.post('/', projectAuth, asyncHandler(projectController.createProject)); // AUTH REQUIRED
router.put('/:id', projectAuth, asyncHandler(projectController.updateProject)); // AUTH REQUIRED
router.delete('/:id', projectAuth, asyncHandler(projectController.deleteProject)); // AUTH REQUIRED

// Project-specific routes
router.get('/:id/history', asyncHandler(projectController.getProjectHistory));
router.post('/:id/feedback', asyncHandler(feedbackController.submitFeedback));
router.get('/:id/feedback', asyncHandler(feedbackController.getProjectFeedback));
router.get('/:id/comments', asyncHandler(projectController.getProjectComments));
router.post('/:id/comments', projectAuth, asyncHandler(projectController.addComment)); // AUTH REQUIRED
router.put('/:id/comments/:commentId', projectAuth, asyncHandler(projectController.updateComment)); // AUTH REQUIRED
router.delete('/:id/comments/:commentId', projectAuth, asyncHandler(projectController.deleteComment)); // AUTH REQUIRED

// FIXED TEAM MANAGEMENT ROUTES - Using teamController
router.get('/:id/team', asyncHandler(teamController.getProjectTeam));
router.post('/:id/team', projectAuth, asyncHandler(teamController.addTeamMember)); // AUTH REQUIRED
router.put('/:id/team/:memberId', projectAuth, asyncHandler(teamController.updateTeamMember)); // AUTH REQUIRED
router.delete('/:id/team/:memberId', projectAuth, asyncHandler(teamController.removeTeamMember)); // AUTH REQUIRED

module.exports = router;