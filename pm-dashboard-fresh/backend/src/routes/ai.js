const express = require('express');
const router = express.Router();

console.log('ðŸ”„ Loading AI routes...');

let aiController;
try {
  aiController = require('../controllers/aiController');
  console.log('âœ… AI controller loaded successfully from ../controllers/aiController');
} catch (error) {
  console.error('âŒ Failed to load AI controller:', error.message);
  
  aiController = {
    chat: async (req, res) => {
      console.log('ðŸ”„ Using fallback AI controller');
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

let aiLimiter;
try {
  const rateLimit = require('express-rate-limit');
  aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100,
    message: {
      success: false,
      error: 'Too many AI requests, please try again later.'
    }
  });
  console.log('âœ… Rate limiter loaded');
} catch (error) {
  console.log('âš ï¸ Rate limiter not available, using fallback');
  aiLimiter = (req, res, next) => next();
}

const aiAuth = async (req, res, next) => {
  try {
    let authToken = null;
    
    const authHeader = req.headers.authorization;
    console.log('ðŸ” Auth header received:', authHeader ? 'Present' : 'Missing');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      authToken = authHeader.substring(7); 
      console.log('ðŸ” Token from Authorization header:', authToken?.length);
    }
    
    if (!authToken && req.cookies && req.cookies.authToken) {
      authToken = req.cookies.authToken;
      console.log('ðŸ” Token from cookies:', authToken?.length);
    }
    
    if (!authToken && req.query.token) {
      authToken = req.query.token;
      console.log('ðŸ” Token from query params:', authToken?.length);
    }
    
    if (!authToken) {
      console.log('âŒ No authentication token found in any location');
      return res.status(401).json({
        success: false,
        error: 'Authentication required - no token provided'
      });
    }

    console.log('ðŸ” Final token to use:', authToken?.substring(0, 10) + '...');
    
    if (authToken.length < 1) {
      console.log('âŒ Invalid token format');
      return res.status(401).json({
        success: false,
        error: 'Invalid token format'
      });
    }

    let userId = null;
    if (!isNaN(authToken) && parseInt(authToken) > 0) {
      userId = parseInt(authToken);
      console.log('ðŸ” Parsed token as user ID:', userId);
    } else {
      console.log('âŒ Token is not a valid user ID:', authToken);
      return res.status(401).json({
        success: false,
        error: 'Invalid token - must be a valid user ID'
      });
    }

    try {
      const { query } = require('../config/database');
      console.log('ðŸ” Looking up user ID:', userId);
      
      const result = await query('SELECT id, name, email, role FROM users WHERE id = $1', [userId]);
      console.log('ðŸ” Database lookup result:', result.rows.length, 'rows');
      
      if (result.rows.length > 0) {
        req.user = result.rows[0];
        console.log('âœ… User authenticated successfully:', req.user.name, 'ID:', req.user.id);
        return next();
      } else {
        console.log('âŒ User not found in database for ID:', userId);
        return res.status(401).json({
          success: false,
          error: 'User not found'
        });
      }
    } catch (dbError) {
      console.error('âŒ Database error during auth:', dbError.message);
      return res.status(500).json({
        success: false,
        error: 'Authentication service error'
      });
    }
  } catch (error) {
    console.error('âŒ Auth middleware error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
};

const validateChatRequest = (req, res, next) => {
  console.log('ðŸ” Validating chat request:', { message: req.body.message?.substring(0, 50) });
  
  const { message } = req.body;
  
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
  
  console.log('âœ… Chat request validation passed');
  next();
};

router.use((req, res, next) => {
  console.log(`ðŸ¤– AI Route: ${req.method} ${req.url}`);
  next();
});

router.use(aiAuth);
router.use(aiLimiter);

router.post('/chat', (req, res, next) => {
  console.log('ðŸŽ¯ POST /chat route hit');
  validateChatRequest(req, res, next);
}, async (req, res) => {
  try {
    console.log('ðŸš€ Calling aiController.chat');
    await aiController.chat(req, res);
  } catch (error) {
    console.error('âŒ Chat route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.get('/insights/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    if (!projectId || (!Number.isInteger(Number(projectId)) || Number(projectId) < 1)) {
      return res.status(400).json({
        success: false,
        error: 'Project ID must be a positive integer'
      });
    }
    
    await aiController.getProjectInsights(req, res);
  } catch (error) {
    console.error('âŒ Insights route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.get('/health', (req, res) => {
  console.log('ðŸ’š AI health check called');
  res.json({
    success: true,
    message: 'AI service is running',
    timestamp: new Date().toISOString()
  });
});

router.use((error, req, res, next) => {
  console.error('ðŸ’¥ AI Route Error:', error.message);
  
  res.status(500).json({
    success: false,
    error: 'AI service error',
    details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

console.log('âœ… AI routes configured');

module.exports = router;