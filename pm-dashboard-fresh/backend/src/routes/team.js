const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireExecutiveLeader } = require('../middleware/rbac');
const teamController = require('../controllers/teamController');
const { asyncHandler } = require('../middleware/errorHandler');

// Import database connection
const { query } = require('../config/database');

// Apply authentication to all routes
router.use(auth);

// Test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Team routes are working!',
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /api/team/executive',
      'POST /api/team/assign',
      'POST /api/team/remove',
      'GET /api/team/executive/dashboard'
    ]
  });
});

// Simple database initialization - create tables if they don't exist
const initializeTeamTables = async () => {
  try {
    console.log('🔄 Initializing team management tables...');

    // Create team assignments table with basic structure
    await query(`
      CREATE TABLE IF NOT EXISTS team_assignments (
        id SERIAL PRIMARY KEY,
        executive_id INTEGER NOT NULL,
        team_member_id INTEGER NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active',
        notes TEXT,
        CONSTRAINT unique_executive_member UNIQUE(executive_id, team_member_id)
      )
    `);

    console.log('✅ Team management tables initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing team management tables:', error);
  }
};

// Initialize tables on module load
initializeTeamTables();

// GET /api/team/executive - EXACTLY matches apiService.getExecutiveTeam()
router.get('/executive', 
  requireExecutiveLeader(),
  async (req, res) => {
    try {
      const executiveId = req.user.id;
      
      console.log(`📋 [GET /api/team/executive] Loading team for executive ${executiveId}`);

      // Get assigned team members - simplified query
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
          0 as active_projects,
          0 as career_goals
        FROM team_assignments ta
        JOIN users u ON ta.team_member_id = u.id
        WHERE ta.executive_id = $1 AND ta.status = 'active'
        ORDER BY ta.assigned_at DESC
      `;

      const teamResult = await query(teamQuery, [executiveId]);

      // Get unassigned team members - simplified query
      const unassignedQuery = `
        SELECT 
          u.id,
          u.name,
          u.email,
          u.role,
          u.created_at,
          0 as active_projects,
          0 as career_goals
        FROM users u
        LEFT JOIN team_assignments ta ON u.id = ta.team_member_id AND ta.status = 'active'
        WHERE u.role IN ('Team Member', 'Project Manager', 'Developer', 'Frontend Developer', 'Backend Developer', 'Product Manager', 'Business Analyst', 'Team Lead', 'DevOps Engineer') 
          AND ta.team_member_id IS NULL
          AND u.id != $1
        ORDER BY u.name
      `;

      const unassignedResult = await query(unassignedQuery, [executiveId]);

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
  }
);

// POST /api/team/assign - EXACTLY matches apiService.assignTeamMembers(memberIds)
router.post('/assign', 
  requireExecutiveLeader(),
  async (req, res) => {
    try {
      const executiveId = req.user.id;
      const { memberIds } = req.body;

      console.log(`📥 [POST /api/team/assign] Request from executive ${executiveId}:`, req.body);

      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Please provide an array of member IDs to assign'
        });
      }

      // Ensure memberIds are integers
      const memberIdsAsInts = memberIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
      
      if (memberIdsAsInts.length !== memberIds.length) {
        return res.status(400).json({
          success: false,
          message: 'All member IDs must be valid integers'
        });
      }

      console.log(`👥 Assigning ${memberIdsAsInts.length} members to executive ${executiveId}`);

      // Process each member individually to avoid any array type issues
      const results = [];
      let assignmentCount = 0;

      for (const memberId of memberIdsAsInts) {
        try {
          // First verify user exists and is eligible
          const verifyQuery = `
            SELECT id, name, role, email
            FROM users 
            WHERE id = $1 
              AND role IN ('Team Member', 'Project Manager', 'Developer', 'Frontend Developer', 'Backend Developer', 'Product Manager', 'Business Analyst', 'Team Lead', 'DevOps Engineer')
          `;
          const verifyResult = await query(verifyQuery, [memberId]);
          
          if (verifyResult.rows.length === 0) {
            console.log(`⚠️ User ${memberId} not found or not eligible`);
            continue;
          }

          // Assign the team member
          const assignQuery = `
            INSERT INTO team_assignments (executive_id, team_member_id, assigned_at)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT (executive_id, team_member_id) 
            DO UPDATE SET 
              status = 'active',
              assigned_at = CURRENT_TIMESTAMP
            RETURNING *
          `;
          
          await query(assignQuery, [executiveId, memberId]);
          
          results.push(verifyResult.rows[0]);
          assignmentCount++;
          
          console.log(`✅ Assigned member ${verifyResult.rows[0].name} (ID: ${memberId})`);
          
        } catch (assignError) {
          console.warn(`⚠️ Failed to assign member ${memberId}:`, assignError.message);
        }
      }

      console.log(`✅ Successfully assigned ${assignmentCount} team members`);

      // Return data in the exact format the frontend expects
      res.json({
        success: true,
        message: `Successfully assigned ${assignmentCount} team members`,
        data: {
          assignedMembers: results,
          assignedCount: assignmentCount,
          projectsAssigned: 0 // Simplified for now
        }
      });

    } catch (error) {
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
    }
  }
);

// POST /api/team/remove - EXACTLY matches apiService.removeTeamMembers(memberIds)
router.post('/remove', 
  requireExecutiveLeader(),
  async (req, res) => {
    try {
      const executiveId = req.user.id;
      const { memberIds } = req.body;

      console.log(`📤 [POST /api/team/remove] Request from executive ${executiveId}:`, req.body);

      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Please provide an array of member IDs to remove'
        });
      }

      // Ensure memberIds are integers
      const memberIdsAsInts = memberIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));

      console.log(`🗑️ Removing ${memberIdsAsInts.length} members from executive ${executiveId}`);

      const validAssignments = [];
      let removedCount = 0;

      // Process each member individually
      for (const memberId of memberIdsAsInts) {
        try {
          // Verify the assignment exists
          const checkQuery = `
            SELECT ta.*, u.name, u.email
            FROM team_assignments ta
            JOIN users u ON ta.team_member_id = u.id
            WHERE ta.executive_id = $1 AND ta.team_member_id = $2 AND ta.status = 'active'
          `;
          const checkResult = await query(checkQuery, [executiveId, memberId]);
          
          if (checkResult.rows.length === 0) {
            console.log(`⚠️ No active assignment found for member ${memberId}`);
            continue;
          }

          // Remove the assignment
          const unassignQuery = `
            UPDATE team_assignments 
            SET status = 'inactive', assigned_at = CURRENT_TIMESTAMP
            WHERE executive_id = $1 AND team_member_id = $2
            RETURNING *
          `;
          await query(unassignQuery, [executiveId, memberId]);
          
          validAssignments.push(checkResult.rows[0]);
          removedCount++;
          
          console.log(`✅ Removed member ${checkResult.rows[0].name} (ID: ${memberId})`);
          
        } catch (removeError) {
          console.warn(`⚠️ Failed to remove member ${memberId}:`, removeError.message);
        }
      }

      if (validAssignments.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No team member assignments found to remove'
        });
      }

      console.log(`✅ Successfully unassigned ${removedCount} members`);

      // Return data in the exact format the frontend expects
      res.json({
        success: true,
        message: `Successfully removed ${removedCount} team members`,
        data: {
          removedMembers: validAssignments,
          removedCount: removedCount,
          projectsRemoved: 0 // Simplified for now
        }
      });

    } catch (error) {
      console.error('❌ Error removing team members:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove team members',
        error: error.message
      });
    }
  }
);

// GET /api/team/executive/dashboard - EXACTLY matches apiService.getExecutiveDashboard()
router.get('/executive/dashboard', 
  requireExecutiveLeader(),
  async (req, res) => {
    try {
      const executiveId = req.user.id;

      console.log(`📊 [GET /api/team/executive/dashboard] Loading analytics for executive ${executiveId}`);

      // Get team overview stats - simplified query
      const statsQuery = `
        SELECT 
          COUNT(DISTINCT ta.team_member_id) as team_size
        FROM team_assignments ta
        WHERE ta.executive_id = $1 AND ta.status = 'active'
      `;

      const statsResult = await query(statsQuery, [executiveId]);

      console.log(`✅ Loaded analytics for executive team`);

      // Return data in the exact format the frontend expects
      res.json({
        success: true,
        data: {
          teamSize: parseInt(statsResult.rows[0].team_size) || 0,
          totalProjects: 0, // Simplified for now
          averageProgress: 75, // Static value for now
          recentActivity: 12 // Static value for now
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
  }
);

// EXISTING ROUTES (keeping for backward compatibility)
// These are commented out to avoid conflicts for now

/*
router.get('/', 
  requireExecutiveLeader(),
  asyncHandler(teamController.getAllTeamMembers)
);

router.get('/my-team', 
  requireExecutiveLeader(),
  asyncHandler(teamController.getExecutiveTeam)
);

router.get('/available', 
  requireExecutiveLeader(),
  asyncHandler(teamController.getAvailableTeamMembers)
);

router.post('/members', 
  requireExecutiveLeader(),
  asyncHandler(teamController.addExecutiveTeamMember)
);

router.get('/members/:userId', 
  requireExecutiveLeader(),
  asyncHandler(teamController.getExecutiveTeamMemberDetails)
);

router.put('/members/:userId', 
  requireExecutiveLeader(),
  asyncHandler(teamController.updateExecutiveTeamMember)
);

router.delete('/members/:userId', 
  requireExecutiveLeader(),
  asyncHandler(teamController.removeExecutiveTeamMember)
);
*/

module.exports = router;