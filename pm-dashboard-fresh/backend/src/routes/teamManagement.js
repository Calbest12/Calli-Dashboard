const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamManagementController');

// Basic authentication middleware (adjust based on your auth setup)
const requireAuth = (req, res, next) => {
  // Simple auth check - adjust based on your authentication system
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // For now, just set a basic user - you can enhance this later
    req.user = { id: parseInt(token) || 1, role: 'Executive Leader' };
    next();
  } else {
    res.status(401).json({ success: false, message: 'Authentication required' });
  }
};

// Apply auth middleware to all routes
router.use(requireAuth);

// Executive Team Management Routes
router.get('/executive', teamController.getExecutiveTeam);
router.post('/assign', teamController.assignTeamMembers);
router.post('/remove', teamController.removeTeamMembers);
router.get('/executive/dashboard', teamController.getExecutiveDashboard);

module.exports = router;