// backend/controllers/authController.js - CORRECTED VERSION

const { query } = require('../config/database');
const { ApiError } = require('../middleware/errorHandler');

const register = async (req, res) => {
  const { name, email, password, role } = req.body;
  
  console.log('🔑 Registration attempt for:', email);
  console.log('🔑 Request body:', { name, email, role, passwordLength: password?.length });
  
  // Validation
  if (!name || !email || !password) {
    throw new ApiError('Name, email, and password are required', 400);
  }
  
  if (password.length < 6) {
    throw new ApiError('Password must be at least 6 characters', 400);
  }
  
  try {
    // Check if user already exists
    console.log('🔍 Checking if user exists...');
    const existsQuery = 'SELECT id FROM users WHERE email = $1';
    const existsResult = await query(existsQuery, [email.toLowerCase()]);
    
    if (existsResult.rows.length > 0) {
      console.log('❌ User already exists:', email);
      throw new ApiError('User with this email already exists', 400);
    }
    
    console.log('✅ User does not exist, proceeding with registration');
    
    // Create new user
    const insertQuery = `
      INSERT INTO users (name, email, role, avatar, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id, name, email, role, avatar, created_at
    `;
    
    const avatar = name.split(' ').map(n => n[0]).join('').toUpperCase();
    const userRole = role || 'Team Member';
    
    console.log('💾 Inserting user with values:', [name.trim(), email.toLowerCase(), userRole, avatar]);
    
    const result = await query(insertQuery, [
      name.trim(),
      email.toLowerCase(),
      userRole,
      avatar
    ]);
    
    if (result.rows.length === 0) {
      console.error('❌ User creation failed - no rows returned');
      throw new ApiError('Failed to create user', 500);
    }
    
    const newUser = result.rows[0];
    console.log('✅ User created successfully:', { id: newUser.id, name: newUser.name, email: newUser.email });
    
    // Return user data (excluding sensitive info)
    const userData = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      avatar: newUser.avatar,
      createdAt: newUser.created_at
    };
    
    res.status(201).json({
      success: true,
      data: userData,
      message: 'User registered successfully'
    });
    
  } catch (error) {
    console.error('❌ Registration error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Handle database-specific errors
    if (error.code === '23505') { // PostgreSQL unique violation
      throw new ApiError('User with this email already exists', 400);
    }
    
    throw new ApiError(`Registration failed: ${error.message}`, 500);
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  
  console.log('🔑 Login attempt for:', email);
  console.log('🔑 Request body:', { email, passwordLength: password?.length });
  
  // Validation
  if (!email || !password) {
    throw new ApiError('Email and password are required', 400);
  }
  
  try {
    console.log('🔍 Searching for user in database...');
    
    // Find user by email
    const userQuery = 'SELECT * FROM users WHERE email = $1';
    const result = await query(userQuery, [email.toLowerCase()]);
    
    console.log('🔍 Database query result:', {
      rowCount: result.rows.length,
      foundUser: result.rows[0] ? {
        id: result.rows[0].id,
        name: result.rows[0].name,
        email: result.rows[0].email
      } : null
    });
    
    if (result.rows.length === 0) {
      console.log('❌ User not found in database');
      throw new ApiError('Invalid email or password', 401);
    }
    
    const user = result.rows[0];
    console.log('✅ User found in database:', { id: user.id, name: user.name, email: user.email });
    
    // For demo purposes, we'll use simple password checking
    // In production, you'd use bcrypt to compare hashed passwords
    const demoPasswords = {
      'sarah@company.com': 'demo123',
      'john@company.com': 'demo123', 
      'alice@company.com': 'demo123',
      'mike@company.com': 'demo123'
    };
    
    // Accept 'demo123' for any registered user, or specific demo passwords
    const expectedPassword = demoPasswords[email.toLowerCase()] || 'demo123';
    
    console.log('🔍 Password check:', {
      provided: password,
      expected: expectedPassword,
      match: password === expectedPassword
    });
    
    if (password !== expectedPassword) {
      console.log('❌ Password mismatch for:', email);
      throw new ApiError('Invalid email or password', 401);
    }
    
    // Successful login - return user data (excluding sensitive info)
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'Team Member',
      avatar: user.avatar || user.name?.split(' ').map(n => n[0]).join('') || 'U',
      createdAt: user.created_at
    };
    
    console.log('✅ Login successful for:', userData.name);
    
    res.json({
      success: true,
      data: userData,
      message: 'Login successful'
    });
    
  } catch (error) {
    console.error('❌ Login error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(`Login failed: ${error.message}`, 500);
  }
};

const logout = async (req, res) => {
  console.log('👋 Logout request received');
  
  // For demo purposes, logout is just a success response
  // In production with JWT tokens, you might blacklist the token
  res.json({
    success: true,
    message: 'Logout successful'
  });
};

// Get current user info
const getCurrentUser = async (req, res) => {
  // This would typically use the user ID from a JWT token
  // For demo, we'll just return a placeholder
  res.status(501).json({ 
    success: false,
    message: 'Get current user - Coming soon (requires JWT implementation)' 
  });
};

// Placeholder functions for future implementation
const refreshToken = async (req, res) => {
  res.status(501).json({ 
    success: false,
    message: 'Refresh token - Coming soon' 
  });
};

const verifyToken = async (req, res) => {
  res.status(501).json({ 
    success: false,
    message: 'Verify token - Coming soon' 
  });
};

const forgotPassword = async (req, res) => {
  res.status(501).json({ 
    success: false,
    message: 'Forgot password - Coming soon' 
  });
};

const resetPassword = async (req, res) => {
  res.status(501).json({ 
    success: false,
    message: 'Reset password - Coming soon' 
  });
};

module.exports = {
  register,
  login,
  logout,
  getCurrentUser,
  refreshToken,
  verifyToken,
  forgotPassword,
  resetPassword
};