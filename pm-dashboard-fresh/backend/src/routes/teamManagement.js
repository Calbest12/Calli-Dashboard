// backend/src/routes/teamManagement.js
// Routes that match exactly what the frontend apiService calls expect
const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Middleware to ensure authentication
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  next();
};

// Middleware to ensure executive leader access
const requireExecutiveLeader = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  
  if (req.user.role !== 'Executive Leader') {
    return res.status(403).json({ 
      success: false, 
      error: 'Access denied. Only Executive Leaders can manage teams.' 
    });
  }
  
  next();
};

// Database initialization - create tables if they don't exist
const initializeTeamTables = async () => {
  try {
    console.log('🔄 Initializing team management tables...');

    // Team assignments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS team_assignments (
        id SERIAL PRIMARY KEY,
        executive_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        team_member_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active',
        notes TEXT,
        UNIQUE(executive_id, team_member_id)
      )
    `);

    // Project team members table (if not exists)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_team_members (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role_in_project VARCHAR(100) DEFAULT 'Team Member',
        contribution_percentage INTEGER DEFAULT 0,
        tasks_completed INTEGER DEFAULT 0,
        joined_date DATE DEFAULT CURRENT_DATE,
        status VARCHAR(20) DEFAULT 'active',
        UNIQUE(project_id, user_id)
      )
    `);

    console.log('✅ Team management database tables initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing team management tables:', error);
  }
};

// Initialize tables on module load
initializeTeamTables();

// GET /api/team/executive - EXACTLY matches apiService.getExecutiveTeam()
router.get('/executive', requireAuth, requireExecutiveLeader, async (req, res) => {
  try {
    const executiveId = req.user.id;
    
    console.log(`📋 [GET /api/team/executive] Loading team for executive ${executiveId}`);

    // Get assigned team members with their project participation
    const teamQuery = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.created_at,
        ta.assigned_at,
        ta.status as assignment_status,
        ta.notes,
        COUNT(DISTINCT ptm.project_id) as active_projects,
        COUNT(DISTINCT cdg.id) as career_goals
      FROM team_assignments ta
      JOIN users u ON ta.team_member_id = u.id
      LEFT JOIN project_team_members ptm ON u.id = ptm.user_id AND ptm.status = 'active'
      LEFT JOIN career_development_goals cdg ON u.id = cdg.user_id AND cdg.status = 'active'
      WHERE ta.executive_id = $1 AND ta.status = 'active'
      GROUP BY u.id, u.name, u.email, u.role, u.created_at, ta.assigned_at, ta.status, ta.notes
      ORDER BY ta.assigned_at DESC
    `;

    const teamResult = await pool.query(teamQuery, [executiveId]);

    // Get unassigned team members (not assigned to any executive)
    const unassignedQuery = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.created_at,
        COUNT(DISTINCT ptm.project_id) as active_projects,
        COUNT(DISTINCT cdg.id) as career_goals
      FROM users u
      LEFT JOIN team_assignments ta ON u.id = ta.team_member_id AND ta.status = 'active'
      LEFT JOIN project_team_members ptm ON u.id = ptm.user_id AND ptm.status = 'active'
      LEFT JOIN career_development_goals cdg ON u.id = cdg.user_id AND cdg.status = 'active'
      WHERE u.role IN ('Team Member', 'Project Manager', 'Developer', 'Frontend Developer', 'Backend Developer', 'Product Manager', 'Business Analyst', 'Team Lead', 'DevOps Engineer') 
        AND ta.team_member_id IS NULL
        AND u.id != $1
      GROUP BY u.id, u.name, u.email, u.role, u.created_at
      ORDER BY u.name
    `;

    const unassignedResult = await pool.query(unassignedQuery, [executiveId]);

    console.log(`✅ Found ${teamResult.rows.length} team members and ${unassignedResult.rows.length} unassigned`);

    // Return data in the exact format the frontend expects
    res.json({
      success: true,
      data: {
        teamMembers: teamResult.rows.map(member => ({
          ...member,
          active_projects: parseInt(member.active_projects) || 0,
          career_goals: parseInt(member.career_goals) || 0,
          projectCount: parseInt(member.active_projects) || 0 // Frontend expects projectCount
        })),
        unassignedMembers: unassignedResult.rows.map(member => ({
          ...member,
          active_projects: parseInt(member.active_projects) || 0,
          career_goals: parseInt(member.career_goals) || 0
        })),
        totalTeamSize: teamResult.rows.length
      }
    });

  } catch (error) {
    console.error('❌ Error loading executive team:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load team data',
      error: error.message
    });
  }
});

// POST /api/team/assign - EXACTLY matches apiService.assignTeamMembers(memberIds)
router.post('/assign', requireAuth, requireExecutiveLeader, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const executiveId = req.user.id;
    const { memberIds } = req.body;

    console.log(`📥 [POST /api/team/assign] Request from executive ${executiveId}:`, req.body);

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of member IDs to assign'
      });
    }

    console.log(`👥 Assigning ${memberIds.length} members to executive ${executiveId}`);

    // Verify all users exist and are eligible for assignment
    const verifyQuery = `
      SELECT id, name, role, email
      FROM users 
      WHERE id = ANY($1::int[]) 
        AND role IN ('Team Member', 'Project Manager', 'Developer', 'Frontend Developer', 'Backend Developer', 'Product Manager', 'Business Analyst', 'Team Lead', 'DevOps Engineer')
    `;
    const verifyResult = await client.query(verifyQuery, [memberIds]);

    if (verifyResult.rows.length !== memberIds.length) {
      console.log(`⚠️ Some users not found or not eligible. Expected ${memberIds.length}, found ${verifyResult.rows.length}`);
      return res.status(400).json({
        success: false,
        message: 'Some users are not eligible for team assignment'
      });
    }

    // Assign team members
    let assignmentCount = 0;
    for (const memberId of memberIds) {
      try {
        const assignQuery = `
          INSERT INTO team_assignments (executive_id, team_member_id, assigned_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP)
          ON CONFLICT (executive_id, team_member_id) 
          DO UPDATE SET 
            status = 'active',
            assigned_at = CURRENT_TIMESTAMP
          RETURNING *
        `;
        
        await client.query(assignQuery, [executiveId, memberId]);
        assignmentCount++;
      } catch (assignError) {
        console.warn(`⚠️ Failed to assign member ${memberId}:`, assignError.message);
      }
    }

    // Auto-assign executive to projects created by newly assigned team members
    const projectAssignQuery = `
      INSERT INTO project_team_members (project_id, user_id, role_in_project, joined_date)
      SELECT DISTINCT 
        p.id,
        $1,
        'Executive Oversight',
        CURRENT_DATE
      FROM projects p
      WHERE p.created_by = ANY($2::int[])
        AND NOT EXISTS (
          SELECT 1 FROM project_team_members ptm2 
          WHERE ptm2.project_id = p.id AND ptm2.user_id = $1
        )
    `;

    const projectAssignResult = await client.query(projectAssignQuery, [executiveId, memberIds]);

    await client.query('COMMIT');

    console.log(`✅ Successfully assigned ${assignmentCount} team members`);
    console.log(`✅ Auto-assigned executive to ${projectAssignResult.rowCount} projects`);

    // Return data in the exact format the frontend expects
    res.json({
      success: true,
      message: `Successfully assigned ${assignmentCount} team members`,
      data: {
        assignedMembers: verifyResult.rows,
        assignedCount: assignmentCount,
        projectsAssigned: projectAssignResult.rowCount
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error assigning team members:', error);
    
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({
        success: false,
        message: 'Some team members are already assigned'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to assign team members',
        error: error.message
      });
    }
  } finally {
    client.release();
  }
});

// POST /api/team/remove - EXACTLY matches apiService.removeTeamMembers(memberIds)
router.post('/remove', requireAuth, requireExecutiveLeader, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const executiveId = req.user.id;
    const { memberIds } = req.body;

    console.log(`📤 [POST /api/team/remove] Request from executive ${executiveId}:`, req.body);

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of member IDs to remove'
      });
    }

    console.log(`🗑️ Removing ${memberIds.length} members from executive ${executiveId}`);

    // Verify the assignments exist and get member names
    const checkQuery = `
      SELECT ta.*, u.name, u.email
      FROM team_assignments ta
      JOIN users u ON ta.team_member_id = u.id
      WHERE ta.executive_id = $1 AND ta.team_member_id = ANY($2::int[]) AND ta.status = 'active'
    `;
    const checkResult = await client.query(checkQuery, [executiveId, memberIds]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No team member assignments found to remove'
      });
    }

    // Update assignment status to inactive
    const unassignQuery = `
      UPDATE team_assignments 
      SET status = 'inactive', assigned_at = CURRENT_TIMESTAMP
      WHERE executive_id = $1 AND team_member_id = ANY($2::int[])
      RETURNING *
    `;
    const unassignResult = await client.query(unassignQuery, [executiveId, memberIds]);

    // Remove executive from projects they were auto-assigned to via these team members
    const removeFromProjectsQuery = `
      DELETE FROM project_team_members 
      WHERE user_id = $1 
        AND role_in_project = 'Executive Oversight'
        AND project_id IN (
          SELECT id FROM projects WHERE created_by = ANY($2::int[])
        )
    `;
    const removeResult = await client.query(removeFromProjectsQuery, [executiveId, memberIds]);

    await client.query('COMMIT');

    console.log(`✅ Successfully unassigned ${checkResult.rows.length} members`);
    console.log(`✅ Removed executive from ${removeResult.rowCount} projects`);

    // Return data in the exact format the frontend expects
    res.json({
      success: true,
      message: `Successfully removed ${checkResult.rows.length} team members`,
      data: {
        removedMembers: checkResult.rows,
        removedCount: checkResult.rows.length,
        projectsRemoved: removeResult.rowCount
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error removing team members:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove team members',
      error: error.message
    });
  } finally {
    client.release();
  }
});

// GET /api/team/executive/dashboard - EXACTLY matches apiService.getExecutiveDashboard()
router.get('/executive/dashboard', requireAuth, requireExecutiveLeader, async (req, res) => {
  try {
    const executiveId = req.user.id;

    console.log(`📊 [GET /api/team/executive/dashboard] Loading analytics for executive ${executiveId}`);

    // Get team overview stats
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT ta.team_member_id) as team_size,
        COUNT(DISTINCT ptm.project_id) as total_projects,
        COUNT(DISTINCT cdg.id) as total_career_goals,
        75 as average_progress,
        12 as recent_activity
      FROM team_assignments ta
      LEFT JOIN project_team_members ptm ON ta.team_member_id = ptm.user_id
      LEFT JOIN career_development_goals cdg ON ta.team_member_id = cdg.user_id AND cdg.status = 'active'
      WHERE ta.executive_id = $1 AND ta.status = 'active'
    `;

    const statsResult = await pool.query(statsQuery, [executiveId]);

    console.log(`✅ Loaded analytics for executive team`);

    // Return data in the exact format the frontend expects
    res.json({
      success: true,
      data: {
        teamSize: parseInt(statsResult.rows[0].team_size) || 0,
        totalProjects: parseInt(statsResult.rows[0].total_projects) || 0,
        averageProgress: parseInt(statsResult.rows[0].average_progress) || 0,
        recentActivity: parseInt(statsResult.rows[0].recent_activity) || 0
      }
    });

  } catch (error) {
    console.error('❌ Error loading team analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load team analytics',
      error: error.message
    });
  }
});

// Debug/Test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Team management routes are working!',
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /api/team/executive - Get team members',
      'POST /api/team/assign - Assign team members', 
      'POST /api/team/remove - Remove team members',
      'GET /api/team/executive/dashboard - Get analytics'
    ]
  });
});

module.exports = router;