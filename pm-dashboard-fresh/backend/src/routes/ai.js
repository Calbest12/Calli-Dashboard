const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');

console.log('🔄 Loading AI routes...');

let aiController;
try {
  aiController = require('../controllers/aiController');
  console.log('✅ AI controller loaded successfully from ../controllers/aiController');
} catch (error) {
  console.error('❌ Failed to load AI controller:', error.message);
  console.error('❌ Error stack:', error.stack);
  
  // Create a simple fallback controller
  aiController = {
    chat: async (req, res) => {
      console.log('🔄 Using fallback AI controller');
      res.json({
        success: true,
        response: `Hi ${req.user?.name || 'there'}! AI controller fallback is working. Your message was: "${req.body.message}"`,
        model: 'fallback-controller',
        tokensUsed: 0
      });
    },
    getProjectInsights: async (req, res) => {
      res.json({
        success: true,
        insights: { summary: 'Fallback insights' }
      });
    }
  };
}

// Simple rate limiting fallback if express-rate-limit isn't available
let aiLimiter;
try {
  const rateLimit = require('express-rate-limit');
  aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: {
      success: false,
      error: 'Too many AI requests, please try again later.'
    }
  });
  console.log('✅ Rate limiter loaded');
} catch (error) {
  console.log('⚠️ Rate limiter not available, using fallback');
  aiLimiter = (req, res, next) => next();
}

// Simple auth middleware fallback
let auth;
try {
  auth = require('../middleware/auth');
  console.log('✅ Auth middleware loaded for AI routes');
} catch (error) {
  console.error('❌ Auth middleware failed to load:', error.message);
  auth = (req, res, next) => {
    console.log('⚠️ Using fallback auth for AI route');
    return res.status(500).json({
      success: false,
      error: 'Authentication middleware not available'
    });
  };
}

// Add logging middleware
router.use((req, res, next) => {
  console.log(`🤖 AI Route: ${req.method} ${req.url}`);
  next();
});

// Apply auth and rate limiting
router.use(auth);
router.use(aiLimiter);

// Simple validation functions to replace express-validator
const validateChatRequest = (req, res, next) => {
  console.log('🔍 Validating chat request:', { message: req.body.message?.substring(0, 50) });
  
  const { message, projectId } = req.body;
  
  if (!message || typeof message !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Message is required and must be a string'
    });
  }
  
  if (message.length < 1 || message.length > 4000) {
    return res.status(400).json({
      success: false,
      error: 'Message must be between 1 and 4000 characters'
    });
  }
  
  if (projectId && (!Number.isInteger(Number(projectId)) || Number(projectId) < 1)) {
    return res.status(400).json({
      success: false,
      error: 'Project ID must be a positive integer'
    });
  }
  
  console.log('✅ Chat request validation passed');
  next();
};

const validateProjectId = (req, res, next) => {
  const { projectId } = req.params;
  
  if (!projectId || (!Number.isInteger(Number(projectId)) || Number(projectId) < 1)) {
    return res.status(400).json({
      success: false,
      error: 'Project ID must be a positive integer'
    });
  }
  
  next();
};

// Routes with detailed logging
router.post('/chat', (req, res, next) => {
  console.log('🎯 POST /chat route hit');
  validateChatRequest(req, res, next);
}, asyncHandler((req, res) => {
  console.log('🚀 Calling aiController.chat');
  return aiController.chat(req, res);
}));

router.get('/insights/:projectId', validateProjectId, asyncHandler(aiController.getProjectInsights));

// Health check endpoint
router.get('/health', (req, res) => {
  console.log('💚 AI health check called');
  res.json({
    success: true,
    message: 'AI service is running',
    timestamp: new Date().toISOString()
  });
});

console.log('✅ AI routes configured');

module.exports = router;