const { query } = require('../config/database');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    console.log('ðŸ” Auth middleware - Headers:', {
      authorization: authHeader ? 'Present' : 'Missing',
      userAgent: req.headers['user-agent']?.substring(0, 50)
    });
    
    let user = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7); 
      console.log('ðŸ” Auth token received:', token?.substring(0, 10) + '...');
      
      if (!isNaN(token)) {
        const result = await query('SELECT id, name, email, role FROM users WHERE id = $1', [parseInt(token)]);
        user = result.rows[0];
        console.log('ðŸ” User lookup by ID:', parseInt(token), 'â†’', user ? user.name : 'not found');
      } else if (token.includes('@')) {
        const result = await query('SELECT id, name, email, role FROM users WHERE email = $1', [token]);
        user = result.rows[0];
        console.log('ðŸ” User lookup by email:', token, 'â†’', user ? user.name : 'not found');
      } else {
        const result = await query('SELECT id, name, email, role FROM users WHERE name = $1', [token]);
        user = result.rows[0];
        console.log('ðŸ” User lookup by name:', token, 'â†’', user ? user.name : 'not found');
      }
    }
    
    if (!user) {
      console.log('ðŸ” No user found from token, trying Calli Best fallback...');
      
      const result = await query(
        'SELECT id, name, email, role FROM users WHERE name = $1 OR email = $2', 
        ['Calli Best', 'bcalli@umich.edu']
      );
      
      if (result.rows.length > 0) {
        user = result.rows[0];
        console.log('âœ… Found Calli Best fallback - ID:', user.id, 'Name:', user.name);
      } else {
        console.log('âŒ Calli Best not found in database');
        
        const allUsersResult = await query('SELECT id, name, email FROM users ORDER BY id');
        console.log('ðŸ“‹ Available users in database:', 
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
    
    console.log('âœ… Final authenticated user:', {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    });
    
    req.user = user;
    next();
    
  } catch (error) {
    console.error('âŒ Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication system error: ' + error.message
    });
  }
};

module.exports = auth;