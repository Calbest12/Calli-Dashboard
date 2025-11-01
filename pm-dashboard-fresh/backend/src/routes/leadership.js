const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  createDiamondAssessment,
  getDiamondAssessments,
  createValueAssessment,
  getValueAssessments,
  healthCheck
} = require('../controllers/leadershipController');

router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Leadership routes are working!',
    availableRoutes: [
      'POST /api/leadership/diamond-assessment',
      'GET /api/leadership/diamond-assessments',
      'POST /api/leadership/value-assessment', 
      'GET /api/leadership/value-assessments'
    ]
  });
});

router.post('/diamond-assessment', auth, createDiamondAssessment);
router.get('/diamond-assessments', auth, getDiamondAssessments);
router.post('/value-assessment', auth, createValueAssessment);
router.get('/value-assessments', auth, getValueAssessments);
router.get('/health', healthCheck);

module.exports = router;