// COMPLETELY FIXED teamController.js - Replace your entire file with this:

const { query } = require('../config/database');
const { ApiError } = require('../middleware/errorHandler');

// Get all team members for a project
const getProjectTeam = async (req, res) => {
  try {
    // FIX: Check for both possible parameter names
    const projectId = req.params.projectId || req.params.id;
    
    console.log('🔄 Fetching team for project:', projectId);
    console.log('🔍 All req.params:', req.params);
    console.log('🔍 Project ID type:', typeof projectId, 'Value:', projectId);
    
    // Validate projectId
    if (!projectId || isNaN(parseInt(projectId))) {
      console.error('❌ Invalid project ID provided:', projectId);
      console.error('❌ Available params:', Object.keys(req.params));
      throw new ApiError('Invalid project ID', 400);
    }
    
    const parsedProjectId = parseInt(projectId);
    console.log('✅ Using project ID:', parsedProjectId);
    
    // FIXED SQL QUERY - matches your exact database schema and includes skills
    const result = await query(`
      SELECT 
        ptm.id,
        ptm.project_id,
        ptm.user_id,
        u.name,
        u.email,
        u.avatar,
        u.role,
        ptm.role_in_project,
        ptm.contribution_percentage,
        ptm.tasks_completed,
        ptm.joined_date,
        ptm.skills,
        u.created_at as user_created_at
      FROM project_team_members ptm
      JOIN users u ON ptm.user_id = u.id
      WHERE ptm.project_id = $1
      ORDER BY ptm.joined_date ASC, u.created_at ASC
    `, [parsedProjectId]);
    
    console.log('✅ Raw team members found:', result.rows.length);
    console.log('📋 Raw team data:', result.rows.map(r => ({ id: r.id, name: r.name, role: r.role_in_project })));
    
    // Format the response to match expected frontend structure
    const formattedTeam = result.rows.map(row => {
      console.log('🔄 Processing team member:', row.name);
      console.log('📊 Raw member data:', {
        contribution: row.contribution_percentage,
        tasks: row.tasks_completed,
        skills: row.skills
      });
      
      return {
        id: row.id,
        projectId: row.project_id,
        userId: row.user_id,
        name: row.name,
        email: row.email,
        avatar: row.avatar || row.name?.split(' ').map(n => n[0]).join('').toUpperCase(),
        role: row.role_in_project || row.role || 'Team Member',
        contribution: row.contribution_percentage || 0, // Default to 0, not 85
        tasksCompleted: row.tasks_completed || 0,
        joinedDate: row.joined_date || new Date().toISOString().split('T')[0],
        status: 'active',
        skills: row.skills ? (Array.isArray(row.skills) ? row.skills : JSON.parse(row.skills)) : [], // Parse skills from JSON
        userCreatedAt: row.user_created_at
      };
    });
    
    console.log('✅ Formatted team members:', formattedTeam.length);
    console.log('📋 Final formatted data:', formattedTeam.map(m => ({ id: m.id, name: m.name, role: m.role })));
    
    res.json({
      success: true,
      data: formattedTeam,
      count: formattedTeam.length
    });
  } catch (error) {
    console.error('❌ Failed to fetch project team:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      params: req.params,
      url: req.url
    });
    throw new ApiError('Failed to fetch project team', 500);
  }
};

// Add a new team member to a project
const addTeamMember = async (req, res) => {
  try {
    // FIX: Check for both possible parameter names
    const projectId = req.params.projectId || req.params.id;
    
    console.log('🔄 addTeamMember called with:');
    console.log('  - All params:', req.params);
    console.log('  - projectId:', projectId, typeof projectId);
    console.log('  - URL:', req.url);
    
    const memberData = req.body;
    console.log('  - memberData:', JSON.stringify(memberData, null, 2));
    
    // Validate inputs
    if (!projectId || isNaN(parseInt(projectId))) {
      console.error('❌ Invalid project ID:', projectId);
      throw new ApiError('Invalid project ID', 400);
    }
    
    const { 
      name, 
      email, 
      role, 
      contribution = 0,  // Start at 0%, not 85%
      tasksCompleted = 0, 
      joinedDate = new Date().toISOString().split('T')[0],
      skills = [],
      status = 'active'
    } = memberData;
    
    // Validate required fields
    if (!name || !email || !role) {
      console.error('❌ Missing required fields:', { name: !!name, email: !!email, role: !!role });
      throw new ApiError('Name, email, and role are required', 400);
    }
    
    console.log('✅ Validation passed, starting transaction...');
    
    await query('BEGIN');
    
    try {
      // Check if user already exists
      console.log('🔍 Checking if user exists...');
      const existingUser = await query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      
      let userId;
      
      if (existingUser.rows.length > 0) {
        // User exists, use their ID
        userId = existingUser.rows[0].id;
        console.log('✅ Found existing user:', existingUser.rows[0].name, 'ID:', userId);
        
        // Update their information if needed
        await query(`
          UPDATE users SET 
            name = $1, 
            role = $2, 
            avatar = $3, 
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
        `, [
          name, 
          role,
          name.split(' ').map(n => n[0]).join('').toUpperCase(),
          userId
        ]);
        
        console.log('✅ Updated existing user information');
      } else {
        // Create new user
        console.log('🔄 Creating new user...');
        const newUser = await query(`
          INSERT INTO users (name, email, role, avatar, created_at, updated_at)
          VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING id
        `, [
          name, 
          email, 
          role,
          name.split(' ').map(n => n[0]).join('').toUpperCase()
        ]);
        
        userId = newUser.rows[0].id;
        console.log('✅ Created new user with ID:', userId);
      }
      
      // Check if user is already a team member of this project
      console.log('🔍 Checking if user is already on team...');
      const existingMember = await query(
        'SELECT * FROM project_team_members WHERE project_id = $1 AND user_id = $2',
        [parseInt(projectId), userId]
      );
      
      if (existingMember.rows.length > 0) {
        await query('ROLLBACK');
        console.error('❌ User already on team');
        throw new ApiError('User is already a member of this project', 400);
      }
      
      // Add user to project team
      console.log('🔄 Adding user to project team...');
      const teamMember = await query(`
        INSERT INTO project_team_members (
          project_id, user_id, role_in_project, contribution_percentage, 
          tasks_completed, joined_date, skills
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
        parseInt(projectId),
        userId,
        role,
        contribution,
        tasksCompleted,
        joinedDate,
        JSON.stringify(skills) // Store skills as JSON
      ]);
      
      const memberId = teamMember.rows[0].id;
      console.log('✅ Added to team with member ID:', memberId);
      
      // Get the complete team member data
      console.log('🔍 Fetching complete member data...');
      const completeMember = await query(`
        SELECT 
          ptm.id,
          ptm.project_id,
          ptm.user_id,
          u.name,
          u.email,
          u.avatar,
          u.role,
          ptm.role_in_project,
          ptm.contribution_percentage,
          ptm.tasks_completed,
          ptm.joined_date,
          ptm.skills,
          u.created_at as user_created_at
        FROM project_team_members ptm
        JOIN users u ON ptm.user_id = u.id
        WHERE ptm.id = $1
      `, [memberId]);
      
      if (completeMember.rows.length === 0) {
        await query('ROLLBACK');
        throw new Error('Failed to fetch created member data');
      }
      
      // Format response to match frontend expectations
      const formattedMember = {
        id: completeMember.rows[0].id,
        projectId: completeMember.rows[0].project_id,
        userId: completeMember.rows[0].user_id,
        name: completeMember.rows[0].name,
        email: completeMember.rows[0].email,
        avatar: completeMember.rows[0].avatar,
        role: completeMember.rows[0].role_in_project,
        contribution: completeMember.rows[0].contribution_percentage,
        tasksCompleted: completeMember.rows[0].tasks_completed,
        joinedDate: completeMember.rows[0].joined_date,
        status: 'active',
        skills: completeMember.rows[0].skills ? 
          (Array.isArray(completeMember.rows[0].skills) ? 
            completeMember.rows[0].skills : 
            JSON.parse(completeMember.rows[0].skills)) : [],
        userCreatedAt: completeMember.rows[0].user_created_at
      };
      
      // Log the activity in project history
      console.log('🔄 Adding to project history...');
      await query(`
        INSERT INTO project_history (
          project_id, user_id, action, description, action_type, details
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        parseInt(projectId),
        userId,
        'Team Member Added',
        `${name} was added to the project team`,
        'team_change',
        JSON.stringify({ member: name, action: 'added', role: role })
      ]);
      
      await query('COMMIT');
      
      console.log('✅ Team member added successfully:', formattedMember.name);
      
      res.json({
        success: true,
        data: formattedMember,
        message: 'Team member added successfully'
      });
      
    } catch (innerError) {
      await query('ROLLBACK');
      console.error('❌ Inner transaction error:', innerError);
      throw innerError;
    }
    
  } catch (error) {
    console.error('❌ addTeamMember error details:');
    console.error('  - Error message:', error.message);
    console.error('  - Error stack:', error.stack);
    console.error('  - Request params:', req.params);
    console.error('  - Request body:', req.body);
    console.error('  - Request URL:', req.url);
    
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(`Failed to add team member: ${error.message}`, 500);
  }
};

// Update a team member
const updateTeamMember = async (req, res) => {
  try {
    // FIX: Check for both possible parameter names
    const projectId = req.params.projectId || req.params.id;
    const memberId = req.params.memberId;
    
    console.log('🔄 updateTeamMember called with:');
    console.log('  - All params:', req.params);
    console.log('  - projectId:', projectId, typeof projectId);
    console.log('  - memberId:', memberId, typeof memberId);
    console.log('  - URL:', req.url);
    
    const updateData = req.body;
    console.log('  - updateData:', JSON.stringify(updateData, null, 2));
    
    // Validate inputs
    if (!projectId || isNaN(parseInt(projectId))) {
      console.error('❌ Invalid project ID:', projectId);
      throw new ApiError('Invalid project ID', 400);
    }
    
    if (!memberId || isNaN(parseInt(memberId))) {
      console.error('❌ Invalid member ID:', memberId);
      throw new ApiError('Invalid member ID', 400);
    }
    
    const { 
      name, 
      email, 
      role, 
      contribution, 
      tasksCompleted, 
      joinedDate,
      skills = [],
      status
    } = updateData;
    
    // Validate required fields
    if (!name || !email || !role) {
      console.error('❌ Missing required fields:', { name: !!name, email: !!email, role: !!role });
      throw new ApiError('Name, email, and role are required', 400);
    }
    
    console.log('✅ Validation passed, starting transaction...');
    
    await query('BEGIN');
    
    try {
      // Get the current team member data
      console.log('🔍 Fetching current member data...');
      const currentMember = await query(`
        SELECT ptm.*, u.* FROM project_team_members ptm
        JOIN users u ON ptm.user_id = u.id
        WHERE ptm.id = $1 AND ptm.project_id = $2
      `, [parseInt(memberId), parseInt(projectId)]);
      
      if (currentMember.rows.length === 0) {
        await query('ROLLBACK');
        console.error('❌ Team member not found:', { memberId, projectId });
        throw new ApiError('Team member not found', 404);
      }
      
      const userId = currentMember.rows[0].user_id;
      console.log('✅ Found team member:', currentMember.rows[0].name, 'userId:', userId);
      
      // Update user information - ONLY update columns that exist
      console.log('🔄 Updating user table...');
      await query(`
        UPDATE users SET 
          name = $1, 
          email = $2, 
          role = $3, 
          avatar = $4, 
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
      `, [
        name, 
        email, 
        role,
        name.split(' ').map(n => n[0]).join('').toUpperCase(),
        userId
      ]);
      
      console.log('✅ User table updated');
      
      // Update team member information - ONLY update columns that exist
      console.log('🔄 Updating project_team_members table...');
      await query(`
        UPDATE project_team_members SET 
          role_in_project = $1, 
          contribution_percentage = $2,
          tasks_completed = $3, 
          joined_date = $4,
          skills = $5
        WHERE id = $6
      `, [
        role, 
        contribution || 0,  // Default to 0, not 85
        tasksCompleted || 0, 
        joinedDate || currentMember.rows[0].joined_date,
        JSON.stringify(skills),
        parseInt(memberId)
      ]);
      
      console.log('✅ project_team_members table updated');
      
      // Get the updated team member data
      console.log('🔍 Fetching updated member data...');
      const updatedMember = await query(`
        SELECT 
          ptm.id,
          ptm.project_id,
          ptm.user_id,
          u.name,
          u.email,
          u.avatar,
          u.role,
          ptm.role_in_project,
          ptm.contribution_percentage,
          ptm.tasks_completed,
          ptm.joined_date,
          ptm.skills,
          u.created_at as user_created_at
        FROM project_team_members ptm
        JOIN users u ON ptm.user_id = u.id
        WHERE ptm.id = $1
      `, [parseInt(memberId)]);
      
      if (updatedMember.rows.length === 0) {
        await query('ROLLBACK');
        throw new Error('Failed to fetch updated member data');
      }
      
      // Format response to match frontend expectations
      const formattedMember = {
        id: updatedMember.rows[0].id,
        projectId: updatedMember.rows[0].project_id,
        userId: updatedMember.rows[0].user_id,
        name: updatedMember.rows[0].name,
        email: updatedMember.rows[0].email,
        avatar: updatedMember.rows[0].avatar,
        role: updatedMember.rows[0].role_in_project,
        contribution: updatedMember.rows[0].contribution_percentage,
        tasksCompleted: updatedMember.rows[0].tasks_completed,
        joinedDate: updatedMember.rows[0].joined_date,
        status: 'active',
        skills: updatedMember.rows[0].skills ? 
          (Array.isArray(updatedMember.rows[0].skills) ? 
            updatedMember.rows[0].skills : 
            JSON.parse(updatedMember.rows[0].skills)) : [],
        userCreatedAt: updatedMember.rows[0].user_created_at
      };
      
      // Log the activity in project history
      console.log('🔄 Adding to project history...');
      await query(`
        INSERT INTO project_history (
          project_id, user_id, action, description, action_type, details
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        parseInt(projectId),
        userId,
        'Team Member Updated',
        `${name}'s information was updated`,
        'team_change',
        JSON.stringify({ member: name, action: 'updated' })
      ]);
      
      await query('COMMIT');
      
      console.log('✅ Team member updated successfully:', formattedMember.name);
      
      res.json({
        success: true,
        data: formattedMember,
        message: 'Team member updated successfully'
      });
      
    } catch (innerError) {
      await query('ROLLBACK');
      console.error('❌ Inner transaction error:', innerError);
      throw innerError;
    }
    
  } catch (error) {
    console.error('❌ updateTeamMember error details:');
    console.error('  - Error message:', error.message);
    console.error('  - Error stack:', error.stack);
    console.error('  - Request params:', req.params);
    console.error('  - Request body:', req.body);
    console.error('  - Request URL:', req.url);
    
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(`Failed to update team member: ${error.message}`, 500);
  }
};

// Remove a team member from a project
const removeTeamMember = async (req, res) => {
  try {
    // FIX: Check for both possible parameter names
    const projectId = req.params.projectId || req.params.id;
    const memberId = req.params.memberId;
    
    console.log('🔄 Removing team member:', memberId, 'from project:', projectId);
    console.log('🔍 All params:', req.params);
    
    if (!projectId || isNaN(parseInt(projectId))) {
      throw new ApiError('Invalid project ID', 400);
    }
    
    if (!memberId || isNaN(parseInt(memberId))) {
      throw new ApiError('Invalid member ID', 400);
    }
    
    await query('BEGIN');
    
    try {
      // Get the team member data before deletion
      const memberData = await query(`
        SELECT ptm.*, u.name FROM project_team_members ptm
        JOIN users u ON ptm.user_id = u.id
        WHERE ptm.id = $1 AND ptm.project_id = $2
      `, [parseInt(memberId), parseInt(projectId)]);
      
      if (memberData.rows.length === 0) {
        await query('ROLLBACK');
        throw new ApiError('Team member not found', 404);
      }
      
      const member = memberData.rows[0];
      console.log('✅ Found team member to remove:', member.name);
      
      // Remove from team
      await query(
        'DELETE FROM project_team_members WHERE id = $1',
        [parseInt(memberId)]
      );
      
      // Log the activity in project history
      await query(`
        INSERT INTO project_history (
          project_id, user_id, action, description, action_type, details
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        parseInt(projectId),
        member.user_id,
        'Team Member Removed',
        `${member.name} was removed from the project team`,
        'team_change',
        JSON.stringify({ member: member.name, action: 'removed' })
      ]);
      
      await query('COMMIT');
      
      console.log('✅ Team member removed successfully');
      
      res.json({
        success: true,
        message: 'Team member removed successfully'
      });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('❌ Failed to remove team member:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to remove team member', 500);
  }
};

module.exports = {
  getProjectTeam,
  addTeamMember,
  updateTeamMember,
  removeTeamMember
};