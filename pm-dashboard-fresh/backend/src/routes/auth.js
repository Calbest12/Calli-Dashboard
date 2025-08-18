// backend/src/routes/auth.js - SIMPLE PASSWORD FIX
const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { query } = require('../config/database');
const router = express.Router();

console.log('🔍 Auth routes file loaded successfully');

// Auth controller with simple password storage
const authController = {
  register: async (req, res) => {
    try {
      console.log('📝 Registration attempt');
      const { name, email, password, role } = req.body;
      
      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Name, email, and password are required'
        });
      }
      
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters'
        });
      }
      
      // Check if user already exists
      const existingUser = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
      if (existingUser.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'User with this email already exists'
        });
      }
      
      // Create user in database with the actual password they entered
      const result = await query(
        `INSERT INTO users (name, email, password, role, avatar, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) 
         RETURNING id, name, email, role, avatar, created_at`,
        [
          name.trim(),
          email.toLowerCase(),
          password, // Store the actual password they entered
          role || 'Team Member',
          name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
        ]
      );
      
      const newUser = result.rows[0];
      console.log('✅ Registration successful:', newUser.name);
      
      res.status(201).json({
        success: true,
        data: newUser,
        message: 'User registered successfully'
      });
      
    } catch (error) {
      console.error('❌ Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Registration failed'
      });
    }
  },
  
  login: async (req, res) => {
    try {
      console.log('🔑 Login attempt');
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
      }
      
      // Find user by email and check their actual password
      const result = await query(
        'SELECT id, name, email, role, avatar, password FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      
      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }
      
      const user = result.rows[0];
      
      // Check if the password they entered matches what's in the database
      if (user.password !== password) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }
      
      // Remove password from response
      const { password: userPassword, ...userResponse } = user;
      
      console.log('✅ Login successful:', user.name);
      
      res.json({
        success: true,
        data: userResponse,
        message: 'Login successful'
      });
      
    } catch (error) {
      console.error('❌ Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Login failed'
      });
    }
  },
  
  logout: async (req, res) => {
    console.log('👋 Logout function');
    res.json({
      success: true,
      message: 'Logout successful'
    });
  }
};

// Route definitions
console.log('🔗 Setting up auth routes...');

router.post('/register', asyncHandler(authController.register));
console.log('✅ POST /register route configured');

router.post('/login', asyncHandler(authController.login));
console.log('✅ POST /login route configured');

router.post('/logout', asyncHandler(authController.logout));
console.log('✅ POST /logout route configured');

router.get('/me', (req, res) => {
  res.status(501).json({ 
    success: false,
    message: 'Get current user - Coming soon (requires JWT implementation)' 
  });
});

router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Auth routes are working!',
    timestamp: new Date().toISOString(),
    availableRoutes: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'POST /api/auth/logout',
      'GET /api/auth/me',
      'GET /api/auth/test'
    ]
  });
});

console.log('✅ Auth routes setup complete');

module.exports = router;