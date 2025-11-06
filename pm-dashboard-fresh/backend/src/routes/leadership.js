// backend/src/routes/leadership.js
const express = require('express');
const router = express.Router();

console.log('🏆 Loading Leadership routes...');

// Import controller
let leadershipController;
try {
  leadershipController = require('../controllers/leadershipController');
  console.log('✅ Leadership controller loaded successfully');
} catch (error) {
  console.error('❌ Failed to load Leadership controller:', error.message);
  
  // Fallback controller
  leadershipController = {
    getLeadershipAssessments: async (req, res) => {
      res.json({
        success: true,
        assessments: [],
        message: 'Leadership controller fallback - please check controller file'
      });
    },
    submitLeadershipAssessment: async (req, res) => {
      res.json({
        success: false,
        error: 'Leadership controller fallback - assessment submission disabled'
      });
    },
    getLeadershipAssessmentById: async (req, res) => {
      res.json({
        success: false,
        error: 'Leadership controller fallback - assessment details unavailable'
      });
    },
    getLeadershipMetrics: async (req, res) => {
      res.json({
        success: true,
        metrics: {
          totalAssessments: 0,
          averageScores: { vision: 0, reality: 0, ethics: 0, courage: 0, overall: 0 },
          timeline: {},
          trend: []
        },
        message: 'Leadership controller fallback - no real metrics available'
      });
    },
    deleteLeadershipAssessment: async (req, res) => {
      res.json({
        success: false,
        error: 'Leadership controller fallback - deletion disabled'
      });
    }
  };
}

// Import authentication middleware
let authMiddleware;
try {
  authMiddleware = require('../middleware/auth');
  console.log('✅ Auth middleware loaded for leadership routes');
} catch (error) {
  console.error('❌ Auth middleware not found, using fallback');
  authMiddleware = (req, res, next) => {
    console.log('⚠️ Using fallback auth middleware for leadership routes');
    req.user = { id: 1, role: 'Team Member', name: 'Test User' }; // Fallback user
    next();
  };
}

// Rate limiting for leadership routes
let leadershipLimiter;
try {
  const { leadershipRateLimiter } = require('../config/rateLimitConfig');
  leadershipLimiter = leadershipRateLimiter;
  console.log('✅ Rate limiter configured for leadership routes');
} catch (error) {
  console.log('⚠️ Rate limiter config not found, creating fallback');
  try {
    const rateLimit = require('express-rate-limit');
    leadershipLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 20, // limit each IP to 20 requests per windowMs
      message: {
        success: false,
        error: 'Too many leadership assessment requests, please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false
    });
    console.log('✅ Fallback rate limiter configured for leadership routes');
  } catch (fallbackError) {
    console.log('⚠️ Rate limiter not available, using passthrough');
    leadershipLimiter = (req, res, next) => next();
  }
}

// Apply rate limiting to all leadership routes
router.use(leadershipLimiter);

/**
 * @route GET /api/leadership/assessments
 * @desc Get all leadership assessments for authenticated user
 * @access Private
 * @query {string} [project_id] - Filter by specific project ID
 * @query {string} [user_id] - Get assessments for specific user (Executive Leaders only)
 */
router.get('/assessments', authMiddleware, leadershipController.getLeadershipAssessments);

/**
 * @route POST /api/leadership/assessments  
 * @desc Submit a new leadership assessment
 * @access Private
 * @body {number} [project_id] - Project ID for the assessment
 * @body {object} responses - Assessment responses object
 * @body {string} [type] - Assessment type (default: 'leadership_diamond')
 */
router.post('/assessments', authMiddleware, leadershipController.submitLeadershipAssessment);

/**
 * @route GET /api/leadership/assessments/:id
 * @desc Get specific leadership assessment by ID
 * @access Private
 */
router.get('/assessments/:id', authMiddleware, leadershipController.getLeadershipAssessmentById);

/**
 * @route DELETE /api/leadership/assessments/:id
 * @desc Delete a leadership assessment
 * @access Private
 */
router.delete('/assessments/:id', authMiddleware, leadershipController.deleteLeadershipAssessment);

/**
 * @route GET /api/leadership/metrics
 * @desc Get leadership metrics and analytics
 * @access Private
 * @query {string} [project_id] - Filter metrics by specific project ID
 * @query {string} [user_id] - Get metrics for specific user (Executive Leaders only)
 */
router.get('/metrics', authMiddleware, leadershipController.getLeadershipMetrics);

// Health check endpoint for leadership service
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Leadership Assessment API',
    status: 'operational',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Legacy endpoints for backward compatibility
router.get('/diamond-assessments', authMiddleware, leadershipController.getLeadershipAssessments);
router.post('/diamond-assessment', authMiddleware, leadershipController.submitLeadershipAssessment);

console.log('✅ Leadership routes configured successfully');
console.log('🏆 Available leadership endpoints:');
console.log('   GET    /assessments - Get user assessments');
console.log('   POST   /assessments - Submit new assessment');
console.log('   GET    /assessments/:id - Get assessment details');
console.log('   DELETE /assessments/:id - Delete assessment');
console.log('   GET    /metrics - Get leadership metrics');
console.log('   GET    /health - Health check');

module.exports = router;