// backend/src/controllers/projectController.js
const { query } = require('../config/database');
// FIXED getAllProjects function for projectController.js
// Add missing import at the top of the file:
const { ApiError } = require('../middleware/errorHandler');

// FIXED getAllProjects function with proper team size counting
const getAllProjects = async (req, res) => {
  try {
    let baseQuery = `
    SELECT p.*, 
           u.name as creator_name,
           u.email as creator_email,
           u.avatar as creator_avatar,
           COUNT(DISTINCT ptm.user_id) as team_size
    FROM projects p
    LEFT JOIN users u ON p.created_by = u.id
    LEFT JOIN project_team_members ptm ON p.id = ptm.project_id
    `;
    
    let whereConditions = [];
    let queryParams = [];
    
    // Enhanced filtering for executive leaders
    if (req.user && req.user.role === 'Executive Leader') {
      whereConditions.push(`(
        p.id IN (
          SELECT DISTINCT ptm2.project_id 
          FROM project_team_members ptm2 
          WHERE ptm2.user_id = $${queryParams.length + 1}
        )
        OR p.created_by IN (
          SELECT id FROM users 
          WHERE executive_leader_id = $${queryParams.length + 1}
        )
      )`);
      queryParams.push(req.user.id);
    } else if (req.user) {
      whereConditions.push(`p.id IN (
        SELECT DISTINCT ptm2.project_id 
        FROM project_team_members ptm2 
        WHERE ptm2.user_id = $${queryParams.length + 1}
      )`);
      queryParams.push(req.user.id);
    }
    
    if (whereConditions.length > 0) {
      baseQuery += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    baseQuery += `
      GROUP BY p.id, p.name, p.description, p.status, p.priority, p.deadline, 
               p.created_at, p.updated_at, p.pm_progress, p.leadership_progress, 
               p.change_mgmt_progress, p.career_dev_progress, p.created_by,
               u.name, u.email, u.avatar
      ORDER BY p.updated_at DESC
    `;
    
    console.log('Projects query:', baseQuery);
    const result = await query(baseQuery, queryParams);
    
    const transformedProjects = result.rows.map(project => ({
      ...project,
      // CRITICAL FIX: Ensure team_size is properly cast
      team_size: parseInt(project.team_size) || 0,
      creator_name: project.creator_name || 'Unknown',
      creator_email: project.creator_email || '',
      creator_avatar: project.creator_avatar || project.creator_name?.charAt(0) || 'U',
      owner: {
        name: project.creator_name || 'Unknown',
        email: project.creator_email || '',
        avatar: project.creator_avatar || project.creator_name?.charAt(0) || 'U'
      },
      is_team_project: req.user?.role === 'Executive Leader' && 
                      project.created_by !== req.user.id,
      progress: {
        PM: project.pm_progress || 0,
        Leadership: project.leadership_progress || 0,
        ChangeMgmt: project.change_mgmt_progress || 0,
        CareerDev: project.career_dev_progress || 0
      }
    }));
    
    console.log('Transformed projects count:', transformedProjects.length);
    transformedProjects.forEach(p => {
      console.log(`Project ${p.id}: ${p.name} - Team size: ${p.team_size}`);
    });

    res.json({
      success: true,
      data: transformedProjects,
      total: transformedProjects.length
    });
    
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw new ApiError('Failed to fetch projects', 500);
  }
};

const getProject = async (req, res) => {
  try {
    const projectId = parseInt(req.params.id); // CRITICAL FIX: Ensure integer
    const userId = req.user.id;

    console.log('Getting project with ID:', projectId, 'Type:', typeof projectId);

    // Access control is handled by middleware
    const accessInfo = req.projectAccess;

    // Get basic project info
    const projectQuery = `
      SELECT p.*, 
             u.name as creator_name,
             u.email as creator_email,
             u.avatar as creator_avatar
      FROM projects p
      JOIN users u ON p.created_by = u.id
      WHERE p.id = $1
    `;

    const result = await query(projectQuery, [projectId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const project = result.rows[0];

    // CRITICAL FIX: Cast project ID to integer in team query
    const teamQuery = `
      SELECT u.id, u.name, u.email, u.role, u.avatar,
             ptm.role_in_project, ptm.contribution_percentage, ptm.tasks_completed,
             ptm.joined_date, ptm.skills, ptm.status
      FROM project_team_members ptm
      JOIN users u ON ptm.user_id = u.id
      WHERE ptm.project_id = $1::integer
      ORDER BY u.name
    `;

    console.log('Running team query with projectId:', projectId);
    const teamResult = await query(teamQuery, [projectId]);
    console.log('Team query returned:', teamResult.rows.length, 'members');

    // Transform team members
    const transformedTeamMembers = teamResult.rows.map(member => {
      // CRITICAL FIX: Handle skills properly
      let skills = [];
      if (member.skills) {
        try {
          skills = typeof member.skills === 'string' ? JSON.parse(member.skills) : member.skills;
        } catch (e) {
          console.warn('Failed to parse skills for member:', member.name, member.skills);
          skills = [];
        }
      }

      return {
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role_in_project || member.role || 'Team Member',
        avatar: member.avatar || member.name?.charAt(0)?.toUpperCase() || 'U',
        contribution: member.contribution_percentage || 0,
        tasksCompleted: member.tasks_completed || 0,
        joinedDate: member.joined_date,
        skills: skills,
        status: member.status || 'active'
      };
    });

    console.log('Transformed team members:', transformedTeamMembers.length);

    // Get recent comments
    const commentsQuery = `
      SELECT pc.*, u.name as author_name, u.avatar as author_avatar
      FROM project_comments pc
      JOIN users u ON pc.user_id = u.id
      WHERE pc.project_id = $1::integer
      ORDER BY pc.created_at DESC
      LIMIT 10
    `;

    const commentsResult = await query(commentsQuery, [projectId]);

    // Get project history
    const historyQuery = `
      SELECT ph.*, u.name as user_name
      FROM project_history ph
      LEFT JOIN users u ON ph.user_id = u.id
      WHERE ph.project_id = $1::integer
      ORDER BY ph.created_at DESC
      LIMIT 20
    `;

    const historyResult = await query(historyQuery, [projectId]);

    // Build final response
    const transformedProject = {
      ...project,
      // CRITICAL FIX: Ensure team_size is calculated correctly
      team_size: transformedTeamMembers.length,
      teamMembers: transformedTeamMembers,
      recentComments: commentsResult.rows,
      recentHistory: historyResult.rows,
      creator_name: project.creator_name || 'Unknown',
      creator_email: project.creator_email || '',
      creator_avatar: project.creator_avatar || project.creator_name?.charAt(0) || 'U',
      owner: {
        name: project.creator_name || 'Unknown',
        email: project.creator_email || '',
        avatar: project.creator_avatar || project.creator_name?.charAt(0) || 'U'
      },
      progress: {
        PM: project.pm_progress || 0,
        Leadership: project.leadership_progress || 0,
        ChangeMgmt: project.change_mgmt_progress || 0,
        CareerDev: project.career_dev_progress || 0
      },
      userAccess: {
        level: accessInfo?.role || 'viewer',
        canEdit: accessInfo?.hasAccess && (accessInfo.role === 'Project Manager' || accessInfo.isCreator),
        canManageTeam: accessInfo?.hasAccess && (accessInfo.role === 'Project Manager' || accessInfo.isCreator),
        canComment: accessInfo?.hasAccess || true,
        role: accessInfo?.role || 'viewer'
      }
    };

    console.log('Final project data:', {
      id: transformedProject.id,
      name: transformedProject.name,
      team_size: transformedProject.team_size,
      teamMembersCount: transformedProject.teamMembers.length,
      creator: transformedProject.creator_name
    });

    res.json({
      success: true,
      data: transformedProject
    });

  } catch (error) {
    console.error('Error getting project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get project'
    });
  }
};


// NEW: Function to handle executive leader auto-assignment
const autoAssignExecutiveLeader = async (projectId, creatorId) => {
  try {
    console.log('Ã°Å¸â€Â Checking for executive leader auto-assignment...', { projectId, creatorId });
    
    // Check if the project creator has an executive leader
    const creatorQuery = `
      SELECT u.id, u.name, u.executive_leader_id, el.name as executive_name
      FROM users u
      LEFT JOIN users el ON u.executive_leader_id = el.id
      WHERE u.id = $1
    `;
    const creatorResult = await query(creatorQuery, [creatorId]);
    
    if (creatorResult.rows.length === 0) {
      console.log('Ã¢Å¡Â Ã¯Â¸Â Creator not found, skipping auto-assignment');
      return;
    }
    
    const creator = creatorResult.rows[0];
    
    if (!creator.executive_leader_id) {
      console.log('Ã¢â€žÂ¹Ã¯Â¸Â Creator has no executive leader assigned, skipping auto-assignment');
      return;
    }
    
    console.log('Ã¢Å“â€¦ Found executive leader for auto-assignment:', {
      creator: creator.name,
      executiveId: creator.executive_leader_id,
      executiveName: creator.executive_name
    });
    
    // Check if executive is already on the project team
    const existingMemberQuery = `
      SELECT * FROM project_team_members 
      WHERE project_id = $1 AND user_id = $2
    `;
    const existingResult = await query(existingMemberQuery, [projectId, creator.executive_leader_id]);
    
    if (existingResult.rows.length > 0) {
      console.log('Ã¢â€žÂ¹Ã¯Â¸Â Executive leader already on project team, skipping');
      return;
    }
    
    // Add executive leader to project team with "Executive Oversight" role
    const addExecutiveQuery = `
      INSERT INTO project_team_members (
        project_id, user_id, role_in_project, contribution_percentage,
        tasks_completed, joined_date, skills
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;
    
    const executiveResult = await query(addExecutiveQuery, [
      projectId,
      creator.executive_leader_id,
      'Executive Oversight',
      0, // No contribution percentage for oversight role
      0, // No tasks completed
      new Date().toISOString().split('T')[0],
      JSON.stringify(['Leadership', 'Strategic Oversight'])
    ]);
    
    // Add to project history
    const historyQuery = `
      INSERT INTO project_history (project_id, user_id, action, description, action_type, details)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    
    await query(historyQuery, [
      projectId,
      creator.executive_leader_id,
      'Executive Oversight Added',
      `${creator.executive_name} automatically assigned for executive oversight`,
      'team_change',
      JSON.stringify({
        action: 'auto_assigned',
        role: 'Executive Oversight',
        reason: 'team_member_project_creation'
      })
    ]);
    
    console.log('Ã¢Å“â€¦ Executive leader auto-assigned successfully:', {
      projectId,
      executiveId: creator.executive_leader_id,
      executiveName: creator.executive_name,
      memberId: executiveResult.rows[0].id
    });
    
  } catch (error) {
    console.error('Ã¢ÂÅ’ Error in executive leader auto-assignment:', error);
    // Don't throw - auto-assignment failure shouldn't break project creation
  }
};


const createProject = async (req, res) => {
  try {
    const { name, description, status = 'planning', priority = 'medium', deadline, team = [] } = req.body;
    
    console.log('Ã°Å¸â€œÂ Creating project:', { name, description, status, priority, deadline, team });
    
    if (!name || !name.trim()) {
      throw new ApiError('Project name is required', 400);
    }
    if (!description || !description.trim()) {
      throw new ApiError('Project description is required', 400);
    }
    
    const validStatuses = ['planning', 'active', 'on_hold', 'completed', 'cancelled'];
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    
    if (!validStatuses.includes(status)) {
      throw new ApiError(`Status must be one of: ${validStatuses.join(', ')}`, 400);
    }
    if (!validPriorities.includes(priority)) {
      throw new ApiError(`Priority must be one of: ${validPriorities.join(', ')}`, 400);
    }
    
    await query('BEGIN');
    
    try {
      // Create the project
      const projectQuery = `
        INSERT INTO projects (name, description, status, priority, deadline, created_by, created_at, updated_at,
                            pm_progress, leadership_progress, change_mgmt_progress, career_dev_progress)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 1, 1, 1)
        RETURNING *
      `;
      
      const result = await query(projectQuery, [
        name.trim(),
        description.trim(),
        status,
        priority,
        deadline || null,
        req.user?.id || 1
      ]);
      
      const project = result.rows[0];
      console.log('Ã¢Å“â€¦ Project created:', project);
      
      // Add creator to project team
      const creatorTeamQuery = `
        INSERT INTO project_team_members (project_id, user_id, role_in_project, contribution_percentage, 
                                        tasks_completed, joined_date, skills)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      await query(creatorTeamQuery, [
        project.id,
        req.user?.id || 1,
        'Project Manager',
        100,
        0,
        new Date().toISOString().split('T')[0],
        JSON.stringify(['Project Management', 'Leadership'])
      ]);
      
      // NEW: Auto-assign executive leader if creator has one
      await autoAssignExecutiveLeader(project.id, req.user?.id || 1);
      
      // Add other team members (your existing logic)
      if (team && team.length > 0) {
        for (const member of team) {
          const { name: memberName, email, role = 'Team Member', contribution = 0, skills = [] } = member;
          
          if (!memberName || !email) {
            continue;
          }
          
          // Check if user exists
          let userQuery = 'SELECT id FROM users WHERE email = $1';
          let userResult = await query(userQuery, [email]);
          
          let userId;
          if (userResult.rows.length > 0) {
            userId = userResult.rows[0].id;
          } else {
            // Create new user
            const createUserQuery = `
              INSERT INTO users (name, email, role, avatar, created_at, updated_at)
              VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              RETURNING id
            `;
            const newUserResult = await query(createUserQuery, [
              memberName,
              email,
              'Team Member',
              memberName.split(' ').map(n => n[0]).join('').toUpperCase()
            ]);
            userId = newUserResult.rows[0].id;
          }
          
          // Add to project team
          await query(creatorTeamQuery, [
            project.id,
            userId,
            role,
            contribution,
            0,
            new Date().toISOString().split('T')[0],
            JSON.stringify(skills)
          ]);
        }
      }
      
      // Add to project history
      const historyQuery = `
        INSERT INTO project_history (project_id, user_id, action, description, action_type, details)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      const user = req.user || { name: 'System' };
      await query(historyQuery, [
        project.id,
        user.id || 1,
        'Project Created',
        `Project "${name}" was created by ${user.name}`,
        'project_lifecycle',
        JSON.stringify({ 
          projectName: name,
          initialStatus: status,
          initialPriority: priority,
          teamSize: (team?.length || 0) + 1
        })
      ]);
      
      await query('COMMIT');
      
      res.status(201).json({
        success: true,
        data: project,
        message: `Project "${name}" created successfully. ${user.name} automatically added as project creator.`
      });
      
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('Ã¢ÂÅ’ Error creating project:', error);
    throw new ApiError('Failed to create project', 500);
  }
};

// Update project (only project creators/managers can edit)
const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Extract progress values if they exist
    let pm_progress, leadership_progress, change_mgmt_progress, career_dev_progress;
    
    if (updateData.progress && typeof updateData.progress === 'object') {
      pm_progress = updateData.progress.PM || updateData.progress.pm_progress;
      leadership_progress = updateData.progress.Leadership || updateData.progress.leadership_progress;
      change_mgmt_progress = updateData.progress.ChangeMgmt || updateData.progress.change_mgmt_progress;
      career_dev_progress = updateData.progress.CareerDev || updateData.progress.career_dev_progress;
    }
    
    // Build the update query with individual progress columns
    const updateQuery = `
      UPDATE projects 
      SET 
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        status = COALESCE($4, status),
        priority = COALESCE($5, priority),
        pm_progress = COALESCE($6, pm_progress),
        leadership_progress = COALESCE($7, leadership_progress),
        change_mgmt_progress = COALESCE($8, change_mgmt_progress),
        career_dev_progress = COALESCE($9, career_dev_progress),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await query(updateQuery, [
      id,
      updateData.name,
      updateData.description, 
      updateData.status,
      updateData.priority,
      pm_progress,
      leadership_progress,
      change_mgmt_progress,
      career_dev_progress
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Project updated successfully'
    });
    
  } catch (error) {
    console.error('Ã¢ÂÅ’ Error updating project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update project',
      error: error.message
    });
  }
};

// Delete project (only project creators can delete)
const deleteProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;

    // Check if user is the project creator
    const projectQuery = `SELECT name, created_by FROM projects WHERE id = $1`;
    const projectResult = await query(projectQuery, [projectId]);

    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const project = projectResult.rows[0];

    if (project.created_by !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only project creators can delete projects'
      });
    }

    // Delete related data first (due to foreign key constraints)
    await query('DELETE FROM project_comments WHERE project_id = $1', [projectId]);
    await query('DELETE FROM project_history WHERE project_id = $1', [projectId]);
    await query('DELETE FROM project_team_members WHERE project_id = $1', [projectId]);
    await query('DELETE FROM project_feedback WHERE project_id = $1', [projectId]);
    await query('DELETE FROM project_ownership WHERE project_id = $1', [projectId]);

    // Delete the project
    await query('DELETE FROM projects WHERE id = $1', [projectId]);

    console.log(`Ã¢Å“â€¦ Project deleted: "${project.name}" by user ${userId}`);

    res.json({
      success: true,
      message: `Project "${project.name}" has been deleted successfully`
    });

  } catch (error) {
    console.error('Ã¢ÂÅ’ Error deleting project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project'
    });
  }
};

const checkProjectAccess = async (userId, projectId, level = 'view') => {
  try {
    console.log(`Ã°Å¸â€Â Checking access: User ${userId}, Project ${projectId}, Level ${level}`);
    
    const accessQuery = `
      SELECT 
        u.id as user_id,
        u.role as user_role,
        u.name as user_name,
        p.id as project_id,
        p.name as project_name,
        p.created_by,
        CASE WHEN p.created_by = u.id THEN true ELSE false END as is_creator,
        CASE WHEN ptm.user_id IS NOT NULL THEN true ELSE false END as is_team_member
      FROM users u
      CROSS JOIN projects p
      LEFT JOIN project_team_members ptm ON ptm.project_id = p.id AND ptm.user_id = u.id
      WHERE u.id = $1 AND p.id = $2
    `;
    
    const result = await query(accessQuery, [userId, projectId]);
    
    if (result.rows.length === 0) {
      return { hasAccess: false, reason: 'User or project not found' };
    }
    
    const { user_role, is_creator, is_team_member } = result.rows[0];
    
    // CORRECTED ACCESS LOGIC
    switch (level) {
      case 'view':
        // Everyone can view if they have any relationship to the project
        if (is_creator || is_team_member || user_role === 'Executive Leader') {
          return {
            hasAccess: true,
            role: is_creator ? 'Project Manager' : user_role,
            level: is_creator ? 'manager' : 
                   (user_role === 'Executive Leader' ? 'executive' : 'member'),
            isCreator: is_creator,
            canEdit: is_creator || is_team_member,  // Both can edit
            canManageTeam: is_creator,              // Only PM can manage team
            canDelete: is_creator                   // Only PM can delete
          };
        }
        break;

      case 'edit':
        // Team Members AND Project Managers can edit project dashboard
        if (is_creator || is_team_member) {
          return {
            hasAccess: true,
            role: is_creator ? 'Project Manager' : 'Team Member',
            level: is_creator ? 'manager' : 'member',
            isCreator: is_creator
          };
        }
        // Executive Leaders CANNOT edit
        break;

      case 'manage_team':
        // ONLY Project Managers can manage team
        if (is_creator) {
          return {
            hasAccess: true,
            role: 'Project Manager',
            level: 'manager',
            isCreator: true
          };
        }
        break;

      case 'comment':
        // Anyone with view access can comment
        if (is_creator || is_team_member || user_role === 'Executive Leader') {
          return {
            hasAccess: true,
            role: is_creator ? 'Project Manager' : user_role,
            isCreator: is_creator
          };
        }
        break;
    }

    return { hasAccess: false, reason: `Insufficient permissions for ${level}` };
    
  } catch (error) {
    console.error('Error checking project access:', error);
    return { hasAccess: false, reason: 'Database error' };
  }
};

// Add team member to project (only project managers)
const addTeamMember = async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;
    const { id, role, skills, joinedDate, status } = req.body;

    // Access control is handled by middleware
    if (!req.projectAccess.isCreator) {
      return res.status(403).json({
        success: false,
        error: 'Only project managers can add team members'
      });
    }

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Member ID is required'
      });
    }

    // Check if user exists
    const userCheck = await query('SELECT name, email FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user is already a team member
    const existingMember = await query(
      'SELECT id FROM project_team_members WHERE project_id = $1 AND user_id = $2',
      [projectId, id]
    );

    if (existingMember.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'User is already a team member'
      });
    }

    // Prepare skills JSON
    const skillsJson = Array.isArray(skills) ? JSON.stringify(skills) : '[]';

    // Add team member
    const addMemberQuery = `
      INSERT INTO project_team_members (project_id, user_id, role_in_project, skills, joined_date, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;

    await query(addMemberQuery, [
      projectId,
      id,
      role || 'Team Member',
      skillsJson,
      joinedDate || new Date().toISOString(),
      status || 'active'
    ]);

    // Log in history
    const user = userCheck.rows[0];
    const historyQuery = `
      INSERT INTO project_history (project_id, user_id, action, description, action_type, details, created_at)
      VALUES ($1, $2, 'team_member_added', $3, 'team_change', $4, CURRENT_TIMESTAMP)
    `;
    const description = `Added ${user.name} to the team`;
    const historyDetails = JSON.stringify({ 
      memberId: userId,
      memberName: user.name,
      action: 'add'
    });
    await query(historyQuery, [projectId, req.user.id, description, historyDetails]);

    console.log(`Ã¢Å“â€¦ Added team member ${user.name} to project ${projectId}`);

    res.json({
      success: true,
      message: `${user.name} has been added to the project team`,
      data: {
        id: parseInt(id),
        name: user.name,
        email: user.email,
        role: role || 'Team Member',
        skills: Array.isArray(skills) ? skills : [],
        status: status || 'active',
        joinedDate: joinedDate || new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Ã¢ÂÅ’ Error adding team member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add team member'
    });
  }
};

// Remove team member from project (only project managers)
const removeTeamMember = async (req, res) => {
  try {
    const projectId = req.params.id;
    const memberId = req.params.memberId;
    const userId = req.user.id;

    // Access control is handled by middleware
    if (!req.projectAccess.isCreator) {
      return res.status(403).json({
        success: false,
        error: 'Only project managers can remove team members'
      });
    }

    // Get member info before removing
    const memberQuery = `
      SELECT u.name 
      FROM users u
      JOIN project_team_members ptm ON u.id = ptm.user_id
      WHERE ptm.project_id = $1 AND ptm.user_id = $2
    `;

    const memberResult = await query(memberQuery, [projectId, memberId]);

    if (memberResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Team member not found in this project'
      });
    }

    const memberName = memberResult.rows[0].name;

    // Remove team member
    await query(
      'DELETE FROM project_team_members WHERE project_id = $1 AND user_id = $2',
      [projectId, memberId]
    );

    // Log in history
    const historyQuery = `
      INSERT INTO project_history (project_id, user_id, action, description, action_type, details, created_at)
      VALUES ($1, $2, 'team_member_removed', $3, 'team_change', $4, CURRENT_TIMESTAMP)
    `;
    const description = `Removed ${memberName} from the team`;
    const historyDetails = JSON.stringify({ 
      memberId: memberId,
      memberName: memberName,
      action: 'remove'
    });
    await query(historyQuery, [projectId, userId, description, historyDetails]);

    console.log(`Ã¢Å“â€¦ Removed team member ${memberName} from project ${projectId}`);

    res.json({
      success: true,
      message: `${memberName} has been removed from the project team`
    });

  } catch (error) {
    console.error('Ã¢ÂÅ’ Error removing team member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove team member'
    });
  }
};

// Update team member details (only project managers)
const updateTeamMember = async (req, res) => {
  try {
    const projectId = req.params.id;
    const memberId = req.params.memberId;
    const userId = req.user.id;
    const { role, skills, status, joinedDate } = req.body;

    // Access control is handled by middleware
    if (!req.projectAccess.isCreator) {
      return res.status(403).json({
        success: false,
        error: 'Only project managers can update team members'
      });
    }

    // Check if member exists in project
    const memberCheck = await query(
      'SELECT id FROM project_team_members WHERE project_id = $1 AND user_id = $2',
      [projectId, memberId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Team member not found in this project'
      });
    }

    // Build update query
    const updateFields = [];
    const values = [];
    let valueIndex = 1;

    if (role !== undefined) {
      updateFields.push(`role_in_project = $${valueIndex}`);
      values.push(role);
      valueIndex++;
    }

    if (skills !== undefined) {
      updateFields.push(`skills = $${valueIndex}`);
      values.push(Array.isArray(skills) ? JSON.stringify(skills) : '[]');
      valueIndex++;
    }

    if (status !== undefined) {
      updateFields.push(`status = $${valueIndex}`);
      values.push(status);
      valueIndex++;
    }

    if (joinedDate !== undefined) {
      updateFields.push(`joined_date = $${valueIndex}`);
      values.push(joinedDate);
      valueIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    // Add project_id and user_id for WHERE clause
    values.push(projectId, memberId);

    const updateQuery = `
      UPDATE project_team_members 
      SET ${updateFields.join(', ')}
      WHERE project_id = ${valueIndex} AND user_id = ${valueIndex + 1}
      RETURNING role_in_project, skills, status, joined_date
    `;

    const result = await query(updateQuery, values);

    // Get member name for logging
    const memberNameQuery = `SELECT name FROM users WHERE id = $1`;
    const memberNameResult = await query(memberNameQuery, [memberId]);
    const memberName = memberNameResult.rows[0].name;

    // Log in history
    const historyQuery = `
      INSERT INTO project_history (project_id, user_id, action, description, action_type, details, created_at)
      VALUES ($1, $2, 'team_member_updated', $3, 'team_change', $4, CURRENT_TIMESTAMP)
    `;

    const updateDetails = Object.keys(req.body).join(', ');
    const description = `Updated ${memberName}: ${updateDetails}`;
    const historyDetails = JSON.stringify({ 
      memberId: memberId,
      memberName: memberName,
      action: 'update',
      fieldsUpdated: Object.keys(req.body)
    });
    await query(historyQuery, [projectId, userId, description, historyDetails]);

    console.log(`Ã¢Å“â€¦ Updated team member ${memberName} in project ${projectId}`);

    res.json({
      success: true,
      message: `${memberName}'s details have been updated`,
      data: {
        id: parseInt(memberId),
        name: memberName,
        role: result.rows[0].role_in_project,
        skills: result.rows[0].skills ? JSON.parse(result.rows[0].skills) : [],
        status: result.rows[0].status,
        joinedDate: result.rows[0].joined_date
      }
    });

  } catch (error) {
    console.error('Ã¢ÂÅ’ Error updating team member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update team member'
    });
  }
};

const addProjectFeedback = async (req, res) => {
  // Redirect to feedbackController
  return await require('./feedbackController').submitFeedback(req, res);
};

// Add comment to project (anyone with access can comment)
const addComment = async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Comment text is required'
      });
    }

    // Access control is handled by middleware - anyone with view access can comment
    const addCommentQuery = `
      INSERT INTO project_comments (project_id, user_id, content, created_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      RETURNING id, content, created_at
    `;

    const result = await query(addCommentQuery, [projectId, userId, content.trim()]);
    const newComment = result.rows[0];

    // Get user info for response
    const userQuery = `SELECT name FROM users WHERE id = $1`;
    const userResult = await query(userQuery, [userId]);
    const userName = userResult.rows[0].name;

    // Log in history
    const historyQuery = `
      INSERT INTO project_history (project_id, user_id, action, description, action_type, details, created_at)
      VALUES ($1, $2, 'comment_added', 'Added a comment', 'comment_change', $3, CURRENT_TIMESTAMP)
    `;
    const historyDetails = JSON.stringify({ 
      commentId: newComment.id,
      action: 'add',
      commentContent: content.trim().substring(0, 100) + (content.trim().length > 100 ? '...' : '')
    });
    await query(historyQuery, [projectId, userId, historyDetails]);

    console.log(`Ã¢Å“â€¦ Comment added to project ${projectId} by ${userName}`);

    res.json({
      success: true,
      message: 'Comment added successfully',
      data: {
        id: newComment.id,
        content: newComment.content,
        timestamp: newComment.created_at,
        author: userName,
        author_name: userName,
        userId: userId,
        user_id: userId,
        avatar: userName.charAt(0)
      }
    });

  } catch (error) {
    console.error('Ã¢ÂÅ’ Error adding comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add comment'
    });
  }
};

// Get project comments
const getComments = async (req, res) => {
  try {
    const projectId = req.params.id;
    
    const commentsQuery = `
      SELECT pc.*, u.name as author, u.avatar 
      FROM project_comments pc
      LEFT JOIN users u ON pc.user_id = u.id
      WHERE pc.project_id = $1 
      ORDER BY pc.created_at DESC
    `;
    
    const result = await query(commentsQuery, [projectId]);
    
    const comments = result.rows.map(row => ({
      id: row.id,
      author: row.author || 'Unknown User',
      avatar: row.avatar || row.author?.charAt(0) || 'U',
      content: row.content,
      timestamp: row.created_at,
      userId: row.user_id,
      type: row.comment_type || 'comment'
    }));
    
    res.json({ success: true, data: comments });
  } catch (error) {
    console.error('Error getting comments:', error);
    res.status(500).json({ success: false, error: 'Failed to get comments' });
  }
};

// Get project history
const getProjectHistory = async (req, res) => {
  try {
    const projectId = req.params.id;
    
    const historyQuery = `
      SELECT ph.*, u.name as user_name
      FROM project_history ph
      LEFT JOIN users u ON ph.user_id = u.id
      WHERE ph.project_id = $1 
      ORDER BY ph.created_at DESC
    `;
    
    const result = await query(historyQuery, [projectId]);
    
    const history = result.rows.map(row => ({
      id: row.id,
      user: row.user_name || 'System',
      action: row.action,
      description: row.description || row.action,
      type: row.action_type || 'general',
      details: row.details ? JSON.parse(row.details) : {},
      timestamp: row.created_at
    }));
    
    res.json({ success: true, data: history });
  } catch (error) {
    console.error('Error getting project history:', error);
    res.status(500).json({ success: false, error: 'Failed to get project history' });
  }
};


const getProjectFeedback = async (req, res) => {
  try {
    const projectId = req.params.id;
    
    const feedbackQuery = `
      SELECT pf.*, u.name as user_name
      FROM project_feedback pf
      JOIN users u ON pf.user_id = u.id
      WHERE pf.project_id = $1
      ORDER BY pf.created_at DESC
    `;
    
    const result = await query(feedbackQuery, [projectId]);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error getting feedback:', error);
    res.status(500).json({ success: false, error: 'Failed to get feedback' });
  }
};


// Get project analytics (role-based access)
const getProjectAnalytics = async (req, res) => {
  try {
    const projectId = req.params.id;
    
    // Basic analytics query
    const analyticsQuery = `
      SELECT 
        p.pm_progress,
        p.leadership_progress,
        p.change_mgmt_progress,
        p.career_dev_progress,
        p.status,
        p.priority,
        COUNT(DISTINCT ptm.user_id) as team_size,
        COUNT(DISTINCT pc.id) as comment_count,
        COUNT(DISTINCT ph.id) as activity_count
      FROM projects p
      LEFT JOIN project_team_members ptm ON p.id = ptm.project_id
      LEFT JOIN project_comments pc ON p.id = pc.project_id
      LEFT JOIN project_history ph ON p.id = ph.project_id
      WHERE p.id = $1
      GROUP BY p.id, p.pm_progress, p.leadership_progress, p.change_mgmt_progress, p.career_dev_progress, p.status, p.priority
    `;

    const result = await query(analyticsQuery, [projectId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const analytics = result.rows[0];
    
    res.json({
      success: true,
      analytics: {
        ...analytics,
        team_size: parseInt(analytics.team_size) || 0,
        comment_count: parseInt(analytics.comment_count) || 0,
        activity_count: parseInt(analytics.activity_count) || 0
      }
    });

  } catch (error) {
    console.error('Error getting project analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get project analytics'
    });
  }
};

// Get project team members
const getProjectTeam = async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    
    console.log('📊 Getting project team for ID:', projectId);
    
    const teamQuery = `
      SELECT 
        ptm.user_id as id,
        ptm.role_in_project,
        ptm.joined_date,
        ptm.status,
        ptm.skills,
        u.name,
        u.email,
        u.avatar,
        u.role as user_role
      FROM project_team_members ptm
      JOIN users u ON ptm.user_id = u.id
      WHERE ptm.project_id = $1::integer
      ORDER BY u.name
    `;
    
    const result = await query(teamQuery, [projectId]);
    console.log('📊 Found team members:', result.rows.length);
    
    const team = result.rows.map(row => {
      // Handle skills properly
      let skills = [];
      if (row.skills) {
        try {
          skills = typeof row.skills === 'string' ? JSON.parse(row.skills) : row.skills;
          if (!Array.isArray(skills)) skills = [];
        } catch (e) {
          console.warn('Failed to parse skills for member:', row.name, row.skills);
          skills = [];
        }
      }

      return {
        id: row.id,
        name: row.name,
        email: row.email,
        avatar: row.avatar || row.name?.charAt(0)?.toUpperCase() || 'U',
        role: row.role_in_project || row.user_role || 'Team Member',
        joinedDate: row.joined_date || new Date().toISOString(),
        status: row.status || 'active',
        skills: skills
      };
    });
    
    console.log('✅ Returning team data:', team.length, 'members');
    res.json({ success: true, data: team });
  } catch (error) {
    console.error('❌ Error getting project team:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get project team',
      details: error.message 
    });
  }
};



// NEW: Executive-specific project dashboard
const getExecutiveProjectsDashboard = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'Executive Leader') {
      throw new ApiError('Only Executive Leaders can access this dashboard', 403);
    }
    
    const executiveId = req.user.id;
    
    // Get all projects from team members under this executive
    const teamProjectsQuery = `
      SELECT DISTINCT p.*, 
             u.name as creator_name,
             COUNT(DISTINCT ptm.user_id) as team_size
      FROM projects p
      INNER JOIN users u ON p.created_by = u.id
      LEFT JOIN project_team_members ptm ON p.id = ptm.project_id
      WHERE u.executive_leader_id = $1
      GROUP BY p.id, u.name
      ORDER BY p.updated_at DESC
    `;
    
    const teamProjects = await query(teamProjectsQuery, [executiveId]);
    
    // Get projects where executive is directly assigned
    const directProjectsQuery = `
      SELECT DISTINCT p.*, 
             u.name as creator_name,
             COUNT(DISTINCT ptm.user_id) as team_size
      FROM projects p
      INNER JOIN project_team_members ptm ON p.id = ptm.project_id
      INNER JOIN users u ON p.created_by = u.id
      WHERE ptm.user_id = $1
      GROUP BY p.id, u.name
      ORDER BY p.updated_at DESC
    `;
    
    const directProjects = await query(directProjectsQuery, [executiveId]);
    
    // Combine and deduplicate
    const allProjectIds = new Set();
    const combinedProjects = [];
    
    teamProjects.rows.forEach(project => {
      if (!allProjectIds.has(project.id)) {
        allProjectIds.add(project.id);
        combinedProjects.push({ ...project, source: 'team' });
      }
    });
    
    directProjects.rows.forEach(project => {
      if (!allProjectIds.has(project.id)) {
        allProjectIds.add(project.id);
        combinedProjects.push({ ...project, source: 'direct' });
      }
    });
    
    // Calculate analytics
    const analytics = {
      totalProjects: combinedProjects.length,
      teamProjects: teamProjects.rows.length,
      directProjects: directProjects.rows.length,
      projectsByStatus: combinedProjects.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {}),
      projectsByPriority: combinedProjects.reduce((acc, p) => {
        acc[p.priority] = (acc[p.priority] || 0) + 1;
        return acc;
      }, {}),
      averageProgress: combinedProjects.length > 0 
        ? Math.round(combinedProjects.reduce((sum, p) => {
            const avgProgress = (
              (p.pm_progress || 0) + 
              (p.leadership_progress || 0) + 
              (p.change_mgmt_progress || 0) + 
              (p.career_dev_progress || 0)
            ) / 4;
            return sum + avgProgress;
          }, 0) / combinedProjects.length)
        : 0,
      recentActivity: combinedProjects.filter(p => {
        const daysSinceUpdate = (new Date() - new Date(p.updated_at)) / (1000 * 60 * 60 * 24);
        return daysSinceUpdate <= 30;
      }).length
    };
    
    res.json({
      success: true,
      data: {
        projects: combinedProjects,
        analytics
      }
    });
    
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('Ã¢ÂÅ’ Error fetching executive projects dashboard:', error);
    throw new ApiError('Failed to fetch executive projects dashboard', 500);
  }
};

// Update comment (only author can update)
const updateComment = async (req, res) => {
  try {
    const projectId = req.params.id;
    const commentId = req.params.commentId;
    const userId = req.user.id;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Comment content is required'
      });
    }

    // Check if user owns the comment
    const checkOwnerQuery = `
      SELECT user_id FROM project_comments 
      WHERE id = $1 AND project_id = $2
    `;
    const ownerResult = await query(checkOwnerQuery, [commentId, projectId]);

    if (ownerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    const commentOwnerId = ownerResult.rows[0].user_id;
    if (commentOwnerId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'You can only edit your own comments'
      });
    }

    // Update the comment
    const updateQuery = `
      UPDATE project_comments 
      SET content = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND project_id = $3
      RETURNING id, content, created_at
    `;

    const result = await query(updateQuery, [content.trim(), commentId, projectId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    // Log in history
    const historyQuery = `
      INSERT INTO project_history (project_id, user_id, action, description, action_type, details, created_at)
      VALUES ($1, $2, 'comment_updated', 'Updated a comment', 'comment_change', $3, CURRENT_TIMESTAMP)
    `;
    const historyDetails = JSON.stringify({ 
      commentId: commentId,
      action: 'update',
      commentContent: content.trim().substring(0, 100) + (content.trim().length > 100 ? '...' : '')
    });
    await query(historyQuery, [projectId, userId, historyDetails]);

    console.log(`✅ Comment ${commentId} updated in project ${projectId}`);

    res.json({
      success: true,
      message: 'Comment updated successfully',
      comment: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error updating comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update comment'
    });
  }
};

// Delete comment (only author can delete)
const deleteComment = async (req, res) => {
  try {
    const projectId = req.params.id;
    const commentId = req.params.commentId;
    const userId = req.user.id;

    // Check if user owns the comment
    const checkOwnerQuery = `
      SELECT user_id FROM project_comments 
      WHERE id = $1 AND project_id = $2
    `;
    const ownerResult = await query(checkOwnerQuery, [commentId, projectId]);

    if (ownerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    const commentOwnerId = ownerResult.rows[0].user_id;
    if (commentOwnerId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own comments'
      });
    }

    // Delete the comment
    const deleteQuery = `
      DELETE FROM project_comments 
      WHERE id = $1 AND project_id = $2
    `;

    await query(deleteQuery, [commentId, projectId]);

    // Log in history
    const historyQuery = `
      INSERT INTO project_history (project_id, user_id, action, description, action_type, details, created_at)
      VALUES ($1, $2, 'comment_deleted', 'Deleted a comment', 'comment_change', $3, CURRENT_TIMESTAMP)
    `;
    const historyDetails = JSON.stringify({ 
      commentId: commentId,
      action: 'delete'
    });
    await query(historyQuery, [projectId, userId, historyDetails]);

    console.log(`✅ Comment ${commentId} deleted from project ${projectId}`);

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete comment'
    });
  }
};

// Get all users for team selection
const getAllUsers = async (req, res) => {
  try {
    console.log('👥 Getting all users for team selection...');
    
    const currentUserId = req.user?.id;
    const currentUserRole = req.user?.role;
    
    let usersQuery;
    let queryParams = [];
    
    if (currentUserRole === 'Executive Leader') {
      // Executive Leaders see all users except themselves
      usersQuery = `
        SELECT id, name, email, role, avatar, created_at
        FROM users
        WHERE id != $1
        ORDER BY name ASC
      `;
      queryParams = [currentUserId];
      
    } else {
      // Project Managers and Team Members see users from their organization
      usersQuery = `
        SELECT id, name, email, role, avatar, created_at
        FROM users
        WHERE role IN ('Team Member', 'Project Manager')
        AND id != $1
        ORDER BY name ASC
      `;
      queryParams = [currentUserId];
    }
    
    const result = await query(usersQuery, queryParams);
    
    console.log(`✅ Found ${result.rows.length} users for role: ${currentUserRole}`);
    
    res.json({
      success: true,
      data: result.rows,
      message: `Retrieved ${result.rows.length} users`
    });
    
  } catch (error) {
    console.error('❌ Error getting users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get users',
      message: error.message
    });
  }
};

module.exports = {
  addProjectFeedback,
  getAllProjects,
  getProject,
  createProject,
  checkProjectAccess,
  updateProject,
  deleteProject,
  addTeamMember,
  removeTeamMember,
  updateTeamMember,
  addComment,
  getComments,
  updateComment,
  deleteComment,
  getProjectFeedback,
  getProjectHistory,
  getProjectAnalytics,
  getProjectTeam,
  getExecutiveProjectsDashboard,
  autoAssignExecutiveLeader,
  getAllUsers
};