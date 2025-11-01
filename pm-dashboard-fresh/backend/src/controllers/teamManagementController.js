const { query } = require('../config/database');
const { ApiError } = require('../middleware/errorHandler');

class TeamManagementController {
  // Get executive leader's team members
  getExecutiveTeam = async (req, res) => {
    try {
      const executiveId = req.user?.id || 1; // Use authenticated user ID
      
      console.log('Getting executive team for user:', executiveId);
      
      // Get team members assigned to this executive
      const teamMembersQuery = `
        SELECT id, name, email, role, created_at, updated_at,
               executive_leader_id
        FROM users 
        WHERE executive_leader_id = $1
        ORDER BY name ASC
      `;
      
      const teamMembersResult = await query(teamMembersQuery, [executiveId]);
      const teamMembers = teamMembersResult.rows;
      
      // Get unassigned team members (no executive leader assigned yet)
      const unassignedQuery = `
        SELECT id, name, email, role, created_at, updated_at
        FROM users 
        WHERE executive_leader_id IS NULL 
          AND role IN ('Team Member', 'Manager')
          AND id != $1
        ORDER BY name ASC
      `;
      
      const unassignedResult = await query(unassignedQuery, [executiveId]);
      const unassignedMembers = unassignedResult.rows;
      
      // Get project count for each team member
      const enhancedTeamMembers = await Promise.all(
        teamMembers.map(async (member) => {
          const projectCountQuery = `
            SELECT COUNT(DISTINCT p.id) as project_count
            FROM projects p
            LEFT JOIN project_team_members ptm ON p.id = ptm.project_id
            WHERE ptm.user_id = $1 OR p.created_by = $1
          `;
          const projectCountResult = await query(projectCountQuery, [member.id]);
          
          return {
            ...member,
            projectCount: parseInt(projectCountResult.rows[0]?.project_count || 0)
          };
        })
      );
      
      console.log(`Found ${teamMembers.length} team members and ${unassignedMembers.length} unassigned`);
      
      res.json({
        success: true,
        data: {
          teamMembers: enhancedTeamMembers,
          unassignedMembers,
          totalTeamSize: teamMembers.length
        }
      });
      
    } catch (error) {
      console.error('Error getting executive team:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get executive team data'
      });
    }
  };

  // Assign team members to executive leader
  assignTeamMembers = async (req, res) => {
    try {
      const executiveId = req.user?.id || 1;
      const { memberIds } = req.body;
      
      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Please provide an array of member IDs to assign'
        });
      }
      
      console.log(`Assigning ${memberIds.length} members to executive ${executiveId}`);
      
      // Start transaction
      await query('BEGIN');
      
      try {
        // Update users to assign them to this executive leader
        const updateQuery = `
        UPDATE users 
        SET executive_leader_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ANY($2::int[]) 
            AND role IN ('Team Member', 'Manager', 'Developer', 'Frontend Developer', 'Backend Developer', 'Product Manager', 'Business Analyst', 'Team Lead', 'DevOps Engineer')
            AND (executive_leader_id IS NULL OR executive_leader_id != $1)
        RETURNING id, name, email
        `;
        
        const result = await query(updateQuery, [executiveId, memberIds]);
        const assignedMembers = result.rows;
        
        // Auto-assign executive to existing projects by these team members
        if (assignedMembers.length > 0) {
          const assignedMemberIds = assignedMembers.map(m => m.id);
          
          // Find projects created by newly assigned members
          const projectsQuery = `
            SELECT id, name, created_by
            FROM projects 
            WHERE created_by = ANY($1::int[])
          `;
          const projectsResult = await query(projectsQuery, [assignedMemberIds]);
          
          // Add executive to each project's team if not already there
          for (const project of projectsResult.rows) {
            const addToTeamQuery = `
              INSERT INTO project_team_members (project_id, user_id, role_in_project, contribution_percentage, tasks_completed, joined_date)
              VALUES ($1, $2, $3, $4, $5, $6)
              ON CONFLICT (project_id, user_id) DO NOTHING
            `;
            
            await query(addToTeamQuery, [
              project.id,
              executiveId,
              'Executive Oversight',
              0,
              0,
              new Date().toISOString().split('T')[0]
            ]);
          }
          
          console.log(`Auto-assigned executive to ${projectsResult.rows.length} existing projects`);
        }
        
        await query('COMMIT');
        
        res.json({
          success: true,
          message: `Successfully assigned ${assignedMembers.length} team members`,
          data: { 
            assignedMembers,
            assignedCount: assignedMembers.length 
          }
        });
        
      } catch (error) {
        await query('ROLLBACK');
        throw error;
      }
      
    } catch (error) {
      console.error('Error assigning team members:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign team members'
      });
    }
  };

  // Remove team members from executive leader
  removeTeamMembers = async (req, res) => {
    try {
      const executiveId = req.user?.id || 1;
      const { memberIds } = req.body;
      
      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Please provide an array of member IDs to remove'
        });
      }
      
      console.log(`Removing ${memberIds.length} members from executive ${executiveId}`);
      
      await query('BEGIN');
      
      try {
        // Remove executive assignment
        const updateQuery = `
          UPDATE users 
          SET executive_leader_id = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE id = ANY($1::int[]) 
            AND executive_leader_id = $2
          RETURNING id, name, email
        `;
        
        const result = await query(updateQuery, [memberIds, executiveId]);
        const removedMembers = result.rows;
        
        // Remove executive from projects they were auto-assigned to
        if (removedMembers.length > 0) {
          const removeFromProjectsQuery = `
            DELETE FROM project_team_members 
            WHERE user_id = $1 
              AND role_in_project = 'Executive Oversight'
              AND project_id IN (
                SELECT id FROM projects WHERE created_by = ANY($2::int[])
              )
          `;
          
          const deleteResult = await query(removeFromProjectsQuery, [executiveId, memberIds]);
          console.log(`Removed executive from ${deleteResult.rowCount} projects`);
        }
        
        await query('COMMIT');
        
        res.json({
          success: true,
          message: `Successfully removed ${removedMembers.length} team members`,
          data: { 
            removedMembers,
            removedCount: removedMembers.length 
          }
        });
        
      } catch (error) {
        await query('ROLLBACK');
        throw error;
      }
      
    } catch (error) {
      console.error('Error removing team members:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove team members'
      });
    }
  };

  // Get executive dashboard analytics
  getExecutiveDashboard = async (req, res) => {
    try {
      const executiveId = req.user?.id || 1;
      
      console.log('Getting executive dashboard for user:', executiveId);
      
      // Get team member count
      const teamCountQuery = `
        SELECT COUNT(*) as team_count
        FROM users 
        WHERE executive_leader_id = $1
      `;
      const teamCountResult = await query(teamCountQuery, [executiveId]);
      const teamSize = parseInt(teamCountResult.rows[0]?.team_count || 0);
      
      // Get team projects and their status
      const projectsQuery = `
        SELECT p.id, p.name, p.status, p.priority, p.pm_progress,
               p.leadership_progress, p.change_mgmt_progress, p.career_dev_progress,
               p.created_at, p.updated_at, u.name as creator_name
        FROM projects p
        INNER JOIN users u ON p.created_by = u.id
        WHERE u.executive_leader_id = $1
        ORDER BY p.updated_at DESC
      `;
      
      const projectsResult = await query(projectsQuery, [executiveId]);
      const teamProjects = projectsResult.rows;
      
      // Calculate project statistics
      const projectStats = teamProjects.reduce((acc, project) => {
        acc[project.status] = (acc[project.status] || 0) + 1;
        return acc;
      }, {});
      
      // Calculate average progress
      const totalProgress = teamProjects.reduce((sum, project) => {
        const avgProgress = (
          (project.pm_progress || 0) + 
          (project.leadership_progress || 0) + 
          (project.change_mgmt_progress || 0) + 
          (project.career_dev_progress || 0)
        ) / 4;
        return sum + avgProgress;
      }, 0);
      
      const averageProgress = teamProjects.length > 0 
        ? Math.round((totalProgress / teamProjects.length / 7) * 100)
        : 0;
      
      // Get recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentActivity = teamProjects.filter(p => 
        new Date(p.updated_at) >= thirtyDaysAgo
      ).length;
      
      const dashboardData = {
        teamSize,
        totalProjects: teamProjects.length,
        projectStats,
        averageProgress,
        recentActivity,
        metrics: {
          activeProjects: projectStats.active || 0,
          completedProjects: projectStats.completed || 0,
          onHoldProjects: projectStats.on_hold || 0,
          planningProjects: projectStats.planning || 0
        }
      };
      
      console.log('Executive dashboard data:', dashboardData);
      
      res.json({
        success: true,
        data: dashboardData
      });
      
    } catch (error) {
      console.error('Error getting executive dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get executive dashboard data'
      });
    }
  };
}

module.exports = new TeamManagementController();