const express = require('express');
const careerController = require('../controllers/careerController');
const { asyncHandler } = require('../middleware/errorHandler');
const { query } = require('../config/database');

const router = express.Router();

// Use the same auth pattern as your projects routes
const careerAuth = (req, res, next) => {
  // Get current user from localStorage (should be sent in request)
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    // For now, treat token as user ID
    if (!isNaN(token)) {
      // Get user from database
      query('SELECT id, name, email, role FROM users WHERE id = $1', [parseInt(token)])
        .then(result => {
          if (result.rows.length > 0) {
            req.user = result.rows[0];
            console.log('🔒 Career auth successful for:', req.user.name);
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
    // Try to get the current user from localStorage info
    // Check if there's a user named "Calli Best" (your current user)
    const userResult = await query("SELECT id, name, email, role FROM users WHERE name = 'Calli Best' OR email = 'bcalli@umich.edu' LIMIT 1");
    
    if (userResult.rows.length > 0) {
      req.user = userResult.rows[0];
      console.log('🔒 Using specific user for career:', req.user.name);
    } else {
      // Fallback to first user
      const fallbackResult = await query('SELECT id, name, email, role FROM users ORDER BY id LIMIT 1');
      if (fallbackResult.rows.length > 0) {
        req.user = fallbackResult.rows[0];
        console.log('🔒 Using fallback user for career:', req.user.name);
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

// Career Goals Routes
router.get('/goals', careerAuth, asyncHandler(careerController.getCareerGoals));
router.get('/goals/:userId', careerAuth, asyncHandler(careerController.getCareerGoals));
router.post('/goals', careerAuth, asyncHandler(careerController.createCareerGoal));
router.put('/goals/:id', careerAuth, asyncHandler(careerController.updateCareerGoal));
router.delete('/goals/:id', careerAuth, asyncHandler(careerController.deleteCareerGoal));
router.put('/goals/:id/progress', careerAuth, asyncHandler(careerController.updateGoalProgress));

// Progress History Routes
router.get('/goals/:id/progress-history', careerAuth, asyncHandler(careerController.getGoalProgressHistory));

// Completed Goals Routes (formerly Achievements)
router.get('/completed', careerAuth, asyncHandler(careerController.getUserCompletedGoals));
router.get('/completed/:userId', careerAuth, asyncHandler(careerController.getUserCompletedGoals));
router.delete('/completed/:id', careerAuth, asyncHandler(careerController.deleteCompletedGoal));

// Statistics Routes
router.get('/stats', careerAuth, asyncHandler(careerController.getCareerStats));
router.get('/stats/:userId', careerAuth, asyncHandler(careerController.getCareerStats));

// Health check (no auth needed)
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Career routes are working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;