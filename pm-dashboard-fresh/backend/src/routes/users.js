const express = require('express');
const userController = require('../controllers/userController');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// User CRUD routes
router.get('/', asyncHandler(userController.getAllUsers));
router.get('/:id', asyncHandler(userController.getUser));
router.post('/', asyncHandler(userController.createUser));
router.put('/:id', asyncHandler(userController.updateUser));
router.delete('/:id', asyncHandler(userController.deleteUser));

// User profile routes
router.get('/:id/profile', asyncHandler(userController.getUserProfile));
router.put('/:id/profile', asyncHandler(userController.updateUserProfile));

// User password routes
router.put('/:id/password', asyncHandler(userController.changePassword));

// User preferences routes
router.put('/:id/preferences', asyncHandler(userController.updateUserPreferences));

// User skills routes
router.get('/:id/skills', asyncHandler(userController.getUserSkills));
router.post('/:id/skills', asyncHandler(userController.addUserSkill));
router.delete('/:id/skills/:skillId', asyncHandler(userController.removeUserSkill));

module.exports = router;