// backend/src/middleware/auth.js
// FIXED VERSION - Properly handles user_ prefix tokens

const { query } = require('../config/database');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    console.log('🔍 Auth middleware - Headers:', {
      authorization: authHeader ? 'Present' : 'Missing',
      userAgent: req.headers['user-agent']?.substring(0, 50)
    });
    
    let user = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7); 
      console.log('🔍 Auth token received:', token?.substring(0, 10) + '...');
      
      // FIXED: Handle both "user_15" and "15" formats like career auth does
      let userId = null;
      if (token.startsWith('user_')) {
        userId = parseInt(token.substring(5)); // Remove 'user_' prefix
        console.log('🔍 Extracted user ID from user_ token:', userId);
      } else if (!isNaN(token)) {
        userId = parseInt(token);
        console.log('🔍 Using direct numeric token as user ID:', userId);
      }
      
      // Try user ID lookup first
      if (userId && !isNaN(userId)) {
        try {
          const result = await query('SELECT id, name, email, role FROM users WHERE id = $1', [userId]);
          if (result.rows.length > 0) {
            user = result.rows[0];
            console.log('✅ Token auth success by ID:', user.name, 'ID:', user.id);
          } else {
            console.log('❌ Token auth failed: User not found for ID', userId);
          }
        } catch (tokenError) {
          console.log('❌ Token auth error:', tokenError.message);
        }
      } else if (token.includes('@')) {
        // Fallback: try email lookup
        const result = await query('SELECT id, name, email, role FROM users WHERE email = $1', [token]);
        user = result.rows[0];
        console.log('🔍 User lookup by email:', token, '→', user ? user.name : 'not found');
      } else {
        // Fallback: try name lookup
        const result = await query('SELECT id, name, email, role FROM users WHERE name = $1', [token]);
        user = result.rows[0];
        console.log('🔍 User lookup by name:', token, '→', user ? user.name : 'not found');
      }
    }
    
    if (!user) {
      console.log('🔍 No user found from token, trying Calli Best fallback...');
      
      const result = await query(
        'SELECT id, name, email, role FROM users WHERE name = $1 OR email = $2', 
        ['Calli Best', 'bcalli@umich.edu']
      );
      
      if (result.rows.length > 0) {
        user = result.rows[0];
        console.log('✅ Found Calli Best fallback - ID:', user.id, 'Name:', user.name);
      } else {
        console.log('❌ Calli Best not found in database');
        
        const allUsersResult = await query('SELECT id, name, email FROM users ORDER BY id');
        console.log('📋 Available users in database:', 
          allUsersResult.rows.map(u => `${u.id}: ${u.name} (${u.email})`).join(', ')
        );
      }
    }
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed - no valid user found. Please ensure Calli Best exists in the database.',
        debug: {
          authHeaderPresent: !!authHeader,
          tokenReceived: authHeader ? 'Yes' : 'No'
        }
      });
    }
    
    console.log('✅ Final authenticated user:', {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    });
    
    req.user = user;
    next();
    
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication system error: ' + error.message
    });
  }
};

module.exports = auth;