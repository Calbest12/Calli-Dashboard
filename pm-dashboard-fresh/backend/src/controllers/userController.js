const { query } = require('../config/database');
const { ApiError } = require('../middleware/errorHandler');

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        id, name, email, role, avatar, title, department, 
        skills, phone, location, bio, status, created_at 
      FROM users 
      ORDER BY name
    `);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    throw new ApiError('Failed to fetch users', 500);
  }
};

// Get single user
const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT 
        id, name, email, role, avatar, title, department, 
        skills, phone, location, bio, status, preferences,
        created_at, updated_at, last_login
      FROM users 
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      throw new ApiError('User not found', 404);
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to fetch user', 500);
  }
};

// Create user
const createUser = async (req, res) => {
  try {
    const { 
      name, email, role, title, department, phone, 
      location, bio, skills = [], avatar 
    } = req.body;
    
    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      throw new ApiError('User with this email already exists', 400);
    }
    
    const result = await query(`
      INSERT INTO users (
        name, email, role, title, department, phone, 
        location, bio, skills, avatar, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      name, email, role, title || role, department || 'General',
      phone, location, bio, JSON.stringify(skills),
      avatar || name.split(' ').map(n => n[0]).join('').toUpperCase(),
      'active'
    ]);
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'User created successfully'
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to create user', 500);
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, email, role, title, department, phone, 
      location, bio, skills, avatar, status 
    } = req.body;
    
    const result = await query(`
      UPDATE users SET 
        name = $1, email = $2, role = $3, title = $4, 
        department = $5, phone = $6, location = $7, bio = $8,
        skills = $9, avatar = $10, status = $11, updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *
    `, [
      name, email, role, title, department, phone, 
      location, bio, JSON.stringify(skills), avatar, status, id
    ]);
    
    if (result.rows.length === 0) {
      throw new ApiError('User not found', 404);
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'User updated successfully'
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to update user', 500);
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      throw new ApiError('User not found', 404);
    }
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to delete user', 500);
  }
};

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT 
        id, name, email, role, avatar, title, department, 
        skills, phone, location, bio, status, preferences,
        created_at, updated_at, last_login
      FROM users 
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      throw new ApiError('User not found', 404);
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to fetch user profile', 500);
  }
};

// Update user profile
const updateUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, email, phone, location, bio, title, 
      department, skills = []
    } = req.body;
    
    const result = await query(`
      UPDATE users SET 
        name = $1, email = $2, phone = $3, location = $4,
        bio = $5, title = $6, department = $7, skills = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING 
        id, name, email, role, avatar, title, department, 
        skills, phone, location, bio, status, preferences,
        created_at, updated_at, last_login
    `, [name, email, phone, location, bio, title, department, JSON.stringify(skills), id]);
    
    if (result.rows.length === 0) {
      throw new ApiError('User not found', 404);
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Profile updated successfully'
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to update profile', 500);
  }
};

// Change password (placeholder - implement with proper password hashing)
const changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    
    // TODO: Implement proper password verification and hashing
    // For now, just return success
    console.log('🔒 Password change requested for user:', id);
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    throw new ApiError('Failed to change password', 500);
  }
};

// Update user preferences
const updateUserPreferences = async (req, res) => {
  try {
    const { id } = req.params;
    const preferences = req.body;
    
    const result = await query(`
      UPDATE users SET 
        preferences = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING preferences
    `, [JSON.stringify(preferences), id]);
    
    if (result.rows.length === 0) {
      throw new ApiError('User not found', 404);
    }
    
    res.json({
      success: true,
      data: result.rows[0].preferences,
      message: 'Preferences updated successfully'
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to update preferences', 500);
  }
};

// Get user skills
const getUserSkills = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query('SELECT skills FROM users WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      throw new ApiError('User not found', 404);
    }
    
    res.json({
      success: true,
      data: result.rows[0].skills || []
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to fetch user skills', 500);
  }
};

// Add user skill
const addUserSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const { skillName } = req.body;
    
    // Get current skills
    const userResult = await query('SELECT skills FROM users WHERE id = $1', [id]);
    
    if (userResult.rows.length === 0) {
      throw new ApiError('User not found', 404);
    }
    
    const currentSkills = userResult.rows[0].skills || [];
    
    // Add new skill if it doesn't exist
    if (!currentSkills.includes(skillName)) {
      const updatedSkills = [...currentSkills, skillName];
      
      await query(`
        UPDATE users SET 
          skills = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [JSON.stringify(updatedSkills), id]);
    }
    
    res.json({
      success: true,
      message: 'Skill added successfully'
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to add skill', 500);
  }
};

// Remove user skill
const removeUserSkill = async (req, res) => {
  try {
    const { id, skillId } = req.params;
    
    // For JSON skills, skillId is actually the skill name
    const skillName = skillId;
    
    // Get current skills
    const userResult = await query('SELECT skills FROM users WHERE id = $1', [id]);
    
    if (userResult.rows.length === 0) {
      throw new ApiError('User not found', 404);
    }
    
    const currentSkills = userResult.rows[0].skills || [];
    const updatedSkills = currentSkills.filter(skill => skill !== skillName);
    
    await query(`
      UPDATE users SET 
        skills = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [JSON.stringify(updatedSkills), id]);
    
    res.json({
      success: true,
      message: 'Skill removed successfully'
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to remove skill', 500);
  }
};

module.exports = {
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserProfile,
  updateUserProfile,
  changePassword,
  updateUserPreferences,
  getUserSkills,
  addUserSkill,
  removeUserSkill
};