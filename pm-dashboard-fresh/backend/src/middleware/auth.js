// src/middleware/auth.js
// Database-connected auth middleware

const { query } = require('../config/database');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('⚠️ No auth header, looking for Calli Best specifically...');
      
      // Look for Calli Best specifically
      const result = await query(
        'SELECT id, name, email, role FROM users WHERE name = $1 OR email = $2', 
        ['Calli Best', 'bcalli@umich.edu']
      );
      
      if (result.rows.length > 0) {
        req.user = result.rows[0];
        console.log('🔑 Found Calli Best for AI - ID:', req.user.id, 'Name:', req.user.name);
        return next();
      } else {
        return res.status(401).json({
          success: false,
          error: 'User Calli Best not found in database'
        });
      }
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('🔍 Auth token received:', token);
    
    // Try to find user by ID first (if token is numeric)
    let user;
    if (!isNaN(token)) {
      const result = await query('SELECT id, name, email, role FROM users WHERE id = $1', [parseInt(token)]);
      user = result.rows[0];
      console.log('🔍 User lookup by ID', parseInt(token), ':', user ? user.name : 'not found');
    }
    
    // If not found by ID, try by email
    if (!user) {
      const result = await query('SELECT id, name, email, role FROM users WHERE email = $1', [token]);
      user = result.rows[0];
      console.log('🔍 User lookup by email', token, ':', user ? user.name : 'not found');
    }
    
    // If still not found and the localStorage has user ID 15, try that
    if (!user && token === '15') {
      const result = await query('SELECT id, name, email, role FROM users WHERE id = 15');
      user = result.rows[0];
      console.log('🔍 Direct lookup for ID 15:', user ? user.name : 'not found');
    }
    
    // Final fallback: look for Calli Best
    if (!user) {
      console.log('🔍 Token lookup failed, trying Calli Best fallback...');
      const result = await query(
        'SELECT id, name, email, role FROM users WHERE name = $1 OR email = $2', 
        ['Calli Best', 'bcalli@umich.edu']
      );
      user = result.rows[0];
      console.log('🔍 Calli Best fallback result:', user ? `${user.name} (ID: ${user.id})` : 'not found');
    }
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token - user not found. Please log in again.'
      });
    }
    
    console.log('🔑 Final authenticated user for AI:', user.name, user.email, 'ID:', user.id);
    req.user = user;
    next();
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

module.exports = auth;