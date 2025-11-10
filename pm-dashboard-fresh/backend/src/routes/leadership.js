// backend/src/routes/leadership.js
const express = require('express');
const {
  getLeadershipAssessments,
  submitLeadershipAssessment,
  getLeadershipAssessmentById,
  getLeadershipMetrics,
  deleteLeadershipAssessment
} = require('../controllers/leadershipController');

const router = express.Router();

// Simple middleware to add a test user
router.use((req, res, next) => {
  req.user = { id: 1, role: 'Team Member' };
  next();
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Leadership service is running',
    timestamp: new Date().toISOString()
  });
});

// Routes
router.get('/assessments', getLeadershipAssessments);
router.post('/assessments', submitLeadershipAssessment);
router.get('/assessments/:id', getLeadershipAssessmentById);
router.delete('/assessments/:id', deleteLeadershipAssessment);
router.get('/metrics', getLeadershipMetrics);

// Framework info
router.get('/framework', (req, res) => {
  res.json({
    success: true,
    framework: {
      name: 'Leadership Diamond',
      dimensions: ['Vision', 'Reality', 'Ethics', 'Courage']
    }
  });
});

module.exports = router;