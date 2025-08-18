const { query, withTransaction } = require('../config/database');
const { ApiError } = require('../middleware/errorHandler');

// Helper function to format project data
const formatProjectData = (projectRow, teamMembers = [], feedback = []) => {
  // Handle different team data formats
  let cleanTeam = [];
  
  if (Array.isArray(teamMembers)) {
    // If it's an array, check what type of elements it contains
    cleanTeam = teamMembers
      .filter(member => member !== null && member !== undefined && member !== '')
      .map(member => {
        // If member is an object with a name property, extract the name
        if (typeof member === 'object' && member.name) {
          return member.name;
        }
        // If member is already a string, use it directly
        if (typeof member === 'string') {
          return member;
        }
        // Skip anything else
        return null;
      })
      .filter(name => name && name.trim() !== '');
  }
  
  return {
    id: projectRow.id,
    name: projectRow.name,
    description: projectRow.description,
    status: projectRow.status,
    priority: projectRow.priority,
    deadline: projectRow.deadline,
    lastUpdate: projectRow.last_update,
    progress: {
      PM: projectRow.pm_progress,
      Leadership: projectRow.leadership_progress,
      ChangeMgmt: projectRow.change_mgmt_progress,
      CareerDev: projectRow.career_dev_progress
    },
    team: cleanTeam, // Use the cleaned team array
    feedback: feedback,
    createdAt: projectRow.created_at,
    updatedAt: projectRow.updated_at
  };
};

// Helper function to normalize dates for comparison
const normalizeDate = (dateValue) => {
  if (!dateValue) return null;
  
  // Handle different input types
  let date;
  if (dateValue instanceof Date) {
    date = dateValue;
  } else if (typeof dateValue === 'string') {
    // Remove any time zone info and normalize
    const cleanDateString = dateValue.replace(/T.*$/, '').trim();
    date = new Date(cleanDateString + 'T00:00:00.000Z');
  } else {
    return null;
  }
  
  if (isNaN(date.getTime())) {
    console.warn('⚠️ Invalid date detected:', dateValue);
    return null;
  }
  
  // Return YYYY-MM-DD format in UTC to avoid timezone issues
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

// Get all projects
const getAllProjects = async (req, res) => {
  try {
    const projectsQuery = `
      SELECT p.*, 
             COALESCE(
               array_agg(DISTINCT u.name) FILTER (WHERE u.name IS NOT NULL AND u.name != ''), 
               ARRAY[]::text[]
             ) as team_members
      FROM projects p
      LEFT JOIN project_team_members ptm ON p.id = ptm.project_id
      LEFT JOIN users u ON ptm.user_id = u.id
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `;
    
    const result = await query(projectsQuery);
    
    const projects = await Promise.all(result.rows.map(async (row) => {
      // Get feedback for this project
      const feedbackQuery = `
        SELECT pf.*, u.name as user_name
        FROM project_feedback pf
        JOIN users u ON pf.user_id = u.id
        WHERE pf.project_id = $1
        ORDER BY pf.created_at DESC
      `;
      const feedbackResult = await query(feedbackQuery, [row.id]);
      
      const feedback = feedbackResult.rows.map(f => ({
        id: f.id,
        projectId: f.project_id,
        userId: f.user_id,
        userName: f.user_name,
        timestamp: f.created_at,
        data: {
          PM_Vision: f.pm_vision,
          PM_Time: f.pm_time,
          PM_Quality: f.pm_quality,
          PM_Cost: f.pm_cost,
          Leadership_Vision: f.leadership_vision,
          Leadership_Reality: f.leadership_reality,
          Leadership_Ethics: f.leadership_ethics,
          Leadership_Courage: f.leadership_courage,
          ChangeMgmt_Alignment: f.change_mgmt_alignment,
          ChangeMgmt_Understand: f.change_mgmt_understand,
          ChangeMgmt_Enact: f.change_mgmt_enact,
          CareerDev_KnowYourself: f.career_dev_know_yourself,
          CareerDev_KnowYourMarket: f.career_dev_know_market,
          CareerDev_TellYourStory: f.career_dev_tell_story
        },
        averages: {
          PM: f.pm_average,
          Leadership: f.leadership_average,
          ChangeMgmt: f.change_mgmt_average,
          CareerDev: f.career_dev_average
        }
      }));
      
      // Pass the team_members array directly from the SQL query
      return formatProjectData(row, row.team_members || [], feedback);
    }));
    
    res.json({
      success: true,
      data: projects,
      count: projects.length
    });
  } catch (error) {
    console.error('❌ Error in getAllProjects:', error);
    throw new ApiError('Failed to fetch projects', 500);
  }
};

// Get single project
const getProject = async (req, res) => {
  const projectId = req.params.id;
  
  // Basic validation
  if (!projectId || isNaN(projectId)) {
    throw new ApiError('Invalid project ID', 400);
  }
  
  try {
    // Get project data
    const projectQuery = 'SELECT * FROM projects WHERE id = $1';
    const projectResult = await query(projectQuery, [projectId]);
    
    if (projectResult.rows.length === 0) {
      throw new ApiError('Project not found', 404);
    }
    
    const project = projectResult.rows[0];
    
    // Get team members with details
    const teamQuery = `
      SELECT u.name, u.email, u.avatar, ptm.role_in_project as role,
             ptm.contribution_percentage as contribution, 
             ptm.tasks_completed, ptm.joined_date,
             'active' as status,
             array_agg(us.skill_name) FILTER (WHERE us.skill_name IS NOT NULL) as skills
      FROM project_team_members ptm
      JOIN users u ON ptm.user_id = u.id
      LEFT JOIN user_skills us ON u.id = us.user_id
      WHERE ptm.project_id = $1
      GROUP BY u.id, u.name, u.email, u.avatar, ptm.role_in_project, 
               ptm.contribution_percentage, ptm.tasks_completed, ptm.joined_date
    `;
    const teamResult = await query(teamQuery, [projectId]);
    
    // Get feedback
    const feedbackQuery = `
      SELECT pf.*, u.name as user_name
      FROM project_feedback pf
      JOIN users u ON pf.user_id = u.id
      WHERE pf.project_id = $1
      ORDER BY pf.created_at DESC
    `;
    const feedbackResult = await query(feedbackQuery, [projectId]);
    
    const feedback = feedbackResult.rows.map(f => ({
      id: f.id,
      projectId: f.project_id,
      userId: f.user_id,
      userName: f.user_name,
      timestamp: f.created_at,
      data: {
        PM_Vision: f.pm_vision,
        PM_Time: f.pm_time,
        PM_Quality: f.pm_quality,
        PM_Cost: f.pm_cost,
        Leadership_Vision: f.leadership_vision,
        Leadership_Reality: f.leadership_reality,
        Leadership_Ethics: f.leadership_ethics,
        Leadership_Courage: f.leadership_courage,
        ChangeMgmt_Alignment: f.change_mgmt_alignment,
        ChangeMgmt_Understand: f.change_mgmt_understand,
        ChangeMgmt_Enact: f.change_mgmt_enact,
        CareerDev_KnowYourself: f.career_dev_know_yourself,
        CareerDev_KnowYourMarket: f.career_dev_know_market,
        CareerDev_TellYourStory: f.career_dev_tell_story
      },
      averages: {
        PM: f.pm_average,
        Leadership: f.leadership_average,
        ChangeMgmt: f.change_mgmt_average,
        CareerDev: f.career_dev_average
      }
    }));
    
    const formattedProject = formatProjectData(project, teamResult.rows, feedback);
    formattedProject.teamMembersDetailed = teamResult.rows.map(member => ({
      name: member.name,
      email: member.email,
      avatar: member.avatar,
      role: member.role,
      contribution: member.contribution || 0,
      tasksCompleted: member.tasks_completed || 0,
      joinedDate: member.joined_date,
      skills: member.skills || [],
      status: member.status
    }));
    
    res.json({
      success: true,
      data: formattedProject
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to fetch project', 500);
  }
};

// Create new project
// Create new project
const createProject = async (req, res) => {
  try {
    const { name, description, status, priority, deadline, team, progress } = req.body;
    const user = req.user; // Get the authenticated user from middleware
    
    // Validation
    if (!name || !name.trim()) {
      throw new ApiError('Project name is required', 400);
    }
    if (!description || !description.trim()) {
      throw new ApiError('Project description is required', 400);
    }
    if (!deadline) {
      throw new ApiError('Project deadline is required', 400);
    }
    
    // Get authenticated user ID
    if (!user || !user.id) {
      throw new ApiError('User authentication required', 401);
    }
    
    console.log('🎯 Creating project for user:', user.name, '(ID:', user.id, ')');

    const insertQuery = `
      INSERT INTO projects (name, description, status, priority, deadline, 
                           pm_progress, leadership_progress, change_mgmt_progress, career_dev_progress)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      name, 
      description, 
      status || 'planning', 
      priority || 'medium', 
      deadline,
      progress?.PM || 1, 
      progress?.Leadership || 1, 
      progress?.ChangeMgmt || 1, 
      progress?.CareerDev || 0
    ];
    
    const result = await query(insertQuery, values);
    const project = result.rows[0];
    
    console.log('✅ Project created with ID:', project.id);

    // AUTOMATICALLY add the project creator as a team member
    const creatorTeamInsertQuery = `
      INSERT INTO project_team_members (project_id, user_id, role_in_project, joined_date, contribution_percentage, tasks_completed)
      VALUES ($1, $2, $3, CURRENT_DATE, $4, $5)
    `;
    
    await query(creatorTeamInsertQuery, [
      project.id, 
      user.id, 
      'Project Creator', 
      100, // Start with 100% contribution as creator
      0    // 0 tasks completed initially
    ]);
    
    console.log(`✅ Automatically added project creator as team member: ${user.name}`);

    // Add additional team members if provided
    const allTeamMembers = [user.name]; // Start with creator
    
    if (team && team.length > 0) {
      for (const memberName of team) {
        // Skip if it's the same as the creator
        if (memberName === user.name) {
          console.log(`ℹ️ Skipping duplicate creator: ${memberName}`);
          continue;
        }
        
        // Find user by name
        const userQuery = 'SELECT id, name FROM users WHERE name = $1';
        const userResult = await query(userQuery, [memberName]);
        
        if (userResult.rows.length > 0) {
          const teamInsertQuery = `
            INSERT INTO project_team_members (project_id, user_id, role_in_project, joined_date, contribution_percentage, tasks_completed)
            VALUES ($1, $2, $3, CURRENT_DATE, $4, $5)
          `;
          await query(teamInsertQuery, [
            project.id, 
            userResult.rows[0].id, 
            'Team Member',
            0,  // 0% contribution initially  
            0   // 0 tasks completed initially
          ]);
          
          console.log(`✅ Added additional team member: ${memberName}`);
          allTeamMembers.push(memberName);
        } else {
          console.warn(`⚠️ User not found: ${memberName}`);
        }
      }
    }
    
    // Add to project history with the authenticated user
    const historyQuery = `
      INSERT INTO project_history (project_id, user_id, action, description, action_type, details)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    
    await query(historyQuery, [
      project.id, 
      user.id, 
      'Project Created', 
      `Project "${name}" was created by ${user.name}`, 
      'created',
      JSON.stringify({ 
        status: project.status, 
        priority: project.priority,
        createdBy: user.name,
        initialTeamSize: allTeamMembers.length
      })
    ]);
    
    console.log('✅ Project history added with creator details');
    
    // If additional team members were added, log that too
    if (allTeamMembers.length > 1) {
      const teamHistoryQuery = `
        INSERT INTO project_history (project_id, user_id, action, description, action_type, details)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      await query(teamHistoryQuery, [
        project.id,
        user.id,
        'Team Members Added',
        `Initial team members added: ${allTeamMembers.join(', ')}`,
        'team_change',
        JSON.stringify({
          action: 'initial_team_setup',
          members: allTeamMembers,
          addedBy: user.name
        })
      ]);
      
      console.log('✅ Team setup history added');
    }
    
    const formattedProject = formatProjectData(project, allTeamMembers);
    
    res.status(201).json({
      success: true,
      data: formattedProject,
      message: `Project created successfully. ${user.name} automatically added as project creator.`
    });
    
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('❌ Error creating project:', error);
    throw new ApiError('Failed to create project', 500);
  }
};

// FIXED UPDATE PROJECT FUNCTION
const updateProject = async (req, res) => {
  const projectId = req.params.id;
  
  // Basic validation
  if (!projectId || isNaN(projectId)) {
    throw new ApiError('Invalid project ID', 400);
  }
  
  try {
    const { name, description, status, priority, deadline, progress, team } = req.body;
    
    // First, get the current project data to compare changes
    const currentProjectQuery = `
      SELECT p.*, 
             array_agg(DISTINCT u.name) FILTER (WHERE u.name IS NOT NULL) as current_team
      FROM projects p
      LEFT JOIN project_team_members ptm ON p.id = ptm.project_id
      LEFT JOIN users u ON ptm.user_id = u.id
      WHERE p.id = $1
      GROUP BY p.id
    `;
    const currentResult = await query(currentProjectQuery, [projectId]);
    
    if (currentResult.rows.length === 0) {
      throw new ApiError('Project not found', 404);
    }
    
    const currentProject = currentResult.rows[0];
    console.log('📊 Current project data:', currentProject);
    
    // Validation for required fields
    if (name !== undefined && (!name || !name.trim())) {
      throw new ApiError('Project name cannot be empty', 400);
    }
    if (description !== undefined && (!description || !description.trim())) {
      throw new ApiError('Project description cannot be empty', 400);
    }
    
    // Track what actually changed
    const changes = [];
    const changeDetails = {};
    
    // Check each field for changes
    if (name !== undefined && name !== currentProject.name) {
      changes.push(`name from "${currentProject.name}" to "${name}"`);
      changeDetails.name = { from: currentProject.name, to: name };
    }
    
    if (description !== undefined && description !== currentProject.description) {
      changes.push(`description from "${currentProject.description?.substring(0, 50)}..." to "${description?.substring(0, 50)}..."`);
      changeDetails.description = { from: currentProject.description, to: description };
    }
    
    if (status !== undefined && status !== currentProject.status) {
      changes.push(`status from "${currentProject.status}" to "${status}"`);
      changeDetails.status = { from: currentProject.status, to: status };
    }
    
    if (priority !== undefined && priority !== currentProject.priority) {
      changes.push(`priority from "${currentProject.priority}" to "${priority}"`);
      changeDetails.priority = { from: currentProject.priority, to: priority };
    }
    
    // FIXED DEADLINE COMPARISON
    if (deadline !== undefined) {
      const currentDeadlineNormalized = normalizeDate(currentProject.deadline);
      const newDeadlineNormalized = normalizeDate(deadline);
      
      console.log('🔍 DETAILED Deadline comparison:', {
        current: currentProject.deadline,
        currentType: typeof currentProject.deadline,
        currentNormalized: currentDeadlineNormalized,
        new: deadline,
        newType: typeof deadline,
        newNormalized: newDeadlineNormalized,
        areEqual: currentDeadlineNormalized === newDeadlineNormalized,
        strictEqual: currentDeadlineNormalized === newDeadlineNormalized
      });
      
      // Only proceed if the normalized dates are actually different
      if (currentDeadlineNormalized && newDeadlineNormalized && currentDeadlineNormalized !== newDeadlineNormalized) {
        const oldDate = new Date(currentProject.deadline).toLocaleDateString();
        const newDate = new Date(deadline).toLocaleDateString();
        changes.push(`deadline from "${oldDate}" to "${newDate}"`);
        changeDetails.deadline = { from: currentProject.deadline, to: deadline };
        console.log('✅ Deadline change detected and logged');
      } else if (!currentDeadlineNormalized && newDeadlineNormalized) {
        // Setting deadline for first time
        const newDate = new Date(deadline).toLocaleDateString();
        changes.push(`deadline set to "${newDate}"`);
        changeDetails.deadline = { from: currentProject.deadline, to: deadline };
        console.log('✅ Deadline set for first time');
      } else {
        console.log('ℹ️ No deadline change detected - dates are the same');
      }
    }
    
    // Check progress changes
    if (progress) {
      const currentProgress = {
        PM: currentProject.pm_progress || 0,
        Leadership: currentProject.leadership_progress || 0,
        ChangeMgmt: currentProject.change_mgmt_progress || 0,
        CareerDev: currentProject.career_dev_progress || 0
      };
      
      const progressChanges = [];
      Object.keys(progress).forEach(key => {
        if (progress[key] !== undefined && progress[key] !== currentProgress[key]) {
          progressChanges.push(`${key}: ${currentProgress[key]} → ${progress[key]}`);
          changeDetails[`progress_${key}`] = { from: currentProgress[key], to: progress[key] };
        }
      });
      
      if (progressChanges.length > 0) {
        changes.push(`progress (${progressChanges.join(', ')})`);
      }
    }
    
    // Check team changes
    if (team && Array.isArray(team)) {
      const currentTeam = currentProject.current_team || [];
      const newTeam = team;
      
      const addedMembers = newTeam.filter(member => !currentTeam.includes(member));
      const removedMembers = currentTeam.filter(member => !newTeam.includes(member));
      
      if (addedMembers.length > 0 || removedMembers.length > 0) {
        const teamChanges = [];
        if (addedMembers.length > 0) {
          teamChanges.push(`added ${addedMembers.join(', ')}`);
        }
        if (removedMembers.length > 0) {
          teamChanges.push(`removed ${removedMembers.join(', ')}`);
        }
        changes.push(`team members (${teamChanges.join('; ')})`);
        changeDetails.team = { added: addedMembers, removed: removedMembers };
      }
    }
    
    // If no changes detected, return early
    if (changes.length === 0) {
      console.log('ℹ️ No changes detected for project update');
      return res.json({
        success: true,
        data: formatProjectData(currentProject, currentProject.current_team || []),
        message: 'No changes detected'
      });
    }
    
    console.log('📝 Changes detected:', changes);
    
    // Build dynamic update query only for changed fields
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined && name !== currentProject.name) {
      updateFields.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }
    if (description !== undefined && description !== currentProject.description) {
      updateFields.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }
    if (status !== undefined && status !== currentProject.status) {
      updateFields.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }
    if (priority !== undefined && priority !== currentProject.priority) {
      updateFields.push(`priority = $${paramCount}`);
      values.push(priority);
      paramCount++;
    }
    
    // FIXED DEADLINE UPDATE CONDITION
    if (deadline !== undefined) {
      const currentDeadlineNormalized = normalizeDate(currentProject.deadline);
      const newDeadlineNormalized = normalizeDate(deadline);
      
      if (currentDeadlineNormalized !== newDeadlineNormalized) {
        updateFields.push(`deadline = $${paramCount}`);
        values.push(deadline);
        paramCount++;
      }
    }
    
    if (progress?.PM !== undefined && progress.PM !== currentProject.pm_progress) {
      updateFields.push(`pm_progress = $${paramCount}`);
      values.push(progress.PM);
      paramCount++;
    }
    if (progress?.Leadership !== undefined && progress.Leadership !== currentProject.leadership_progress) {
      updateFields.push(`leadership_progress = $${paramCount}`);
      values.push(progress.Leadership);
      paramCount++;
    }
    if (progress?.ChangeMgmt !== undefined && progress.ChangeMgmt !== currentProject.change_mgmt_progress) {
      updateFields.push(`change_mgmt_progress = $${paramCount}`);
      values.push(progress.ChangeMgmt);
      paramCount++;
    }
    if (progress?.CareerDev !== undefined && progress.CareerDev !== currentProject.career_dev_progress) {
      updateFields.push(`career_dev_progress = $${paramCount}`);
      values.push(progress.CareerDev);
      paramCount++;
    }
    
    // Always update the updated_at timestamp
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    // Add project ID as the last parameter
    values.push(projectId);
    
    const updateQuery = `
      UPDATE projects 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    console.log('🔄 Updating project with query:', updateQuery);
    console.log('🔄 Values:', values);
    
    const result = await query(updateQuery, values);
    const updatedProject = result.rows[0];
    
    // Update team members if changed
    if (team && Array.isArray(team) && changeDetails.team) {
      // Remove existing team members
      await query('DELETE FROM project_team_members WHERE project_id = $1', [projectId]);
      
      // Add new team members
      for (const memberName of team) {
        const userQuery = 'SELECT id FROM users WHERE name = $1';
        const userResult = await query(userQuery, [memberName]);
        
        if (userResult.rows.length > 0) {
          const teamInsertQuery = `
            INSERT INTO project_team_members (project_id, user_id, role_in_project)
            VALUES ($1, $2, $3)
          `;
          await query(teamInsertQuery, [projectId, userResult.rows[0].id, 'Team Member']);
          console.log(`✅ Updated team member: ${memberName}`);
        } else {
          console.warn(`⚠️ User not found: ${memberName}`);
        }
      }
    }
    
    // Only create history entry if there are actual changes
    if (changes.length > 0) {
      const historyQuery = `
        INSERT INTO project_history (project_id, user_id, action, description, action_type, details)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      // Use first user as updater (in real app, get from auth)
      const updaterQuery = 'SELECT id FROM users LIMIT 1';
      const updaterResult = await query(updaterQuery);
      const updaterId = updaterResult.rows[0]?.id || 1;
      
      // Create detailed description
      const detailedDescription = `Project "${updatedProject.name}" was updated: ${changes.join(', ')}`;
      
      await query(historyQuery, [
        projectId, 
        updaterId, 
        'Project Updated', 
        detailedDescription,
        'project_update',
        JSON.stringify(changeDetails)
      ]);
      
      console.log('✅ Project history added with detailed changes');
    }
    
    // Get updated team data
    const teamQuery = `
      SELECT u.name
      FROM project_team_members ptm
      JOIN users u ON ptm.user_id = u.id
      WHERE ptm.project_id = $1
    `;
    const teamResult = await query(teamQuery, [projectId]);
    const teamMembers = teamResult.rows.map(row => row.name);
    
    const formattedProject = formatProjectData(updatedProject, teamMembers);
    
    res.json({
      success: true,
      data: formattedProject,
      message: changes.length > 0 ? `Project updated successfully: ${changes.join(', ')}` : 'No changes detected'
    });
    
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('❌ Error updating project:', error);
    throw new ApiError('Failed to update project', 500);
  }
};

// Fixed deleteProject function for projectController.js
// Replace your existing deleteProject function with this:

const deleteProject = async (req, res) => {
  const projectId = req.params.id;
  
  // Basic validation
  if (!projectId || isNaN(projectId)) {
    throw new ApiError('Invalid project ID', 400);
  }
  
  try {
    // Check if project exists
    const existsQuery = 'SELECT id, name FROM projects WHERE id = $1';
    const existsResult = await query(existsQuery, [projectId]);
    
    if (existsResult.rows.length === 0) {
      throw new ApiError('Project not found', 404);
    }
    
    const projectName = existsResult.rows[0].name;
    
    console.log('🗑️ Deleting project:', projectName, 'ID:', projectId);
    
    // Use transaction to ensure data consistency
    await query('BEGIN');
    
    try {
      // Delete related data in correct order (foreign key constraints)
      
      // 1. Delete AI interactions
      await query('DELETE FROM ai_interactions WHERE project_id = $1', [projectId]);
      console.log('✅ Deleted AI interactions');
      
      // 2. Delete project feedback
      await query('DELETE FROM project_feedback WHERE project_id = $1', [projectId]);
      console.log('✅ Deleted project feedback');
      
      // 3. Delete project comments (if table exists)
      try {
        await query('DELETE FROM project_comments WHERE project_id = $1', [projectId]);
        console.log('✅ Deleted project comments');
      } catch (err) {
        // Table might not exist yet, that's okay
        console.log('ℹ️ No project comments table found (or no comments to delete)');
      }
      
      // 4. Delete team member associations
      await query('DELETE FROM project_team_members WHERE project_id = $1', [projectId]);
      console.log('✅ Deleted team member associations');
      
      // 5. Delete project history
      await query('DELETE FROM project_history WHERE project_id = $1', [projectId]);
      console.log('✅ Deleted project history');
      
      // 6. Finally, delete the project itself
      const deleteResult = await query('DELETE FROM projects WHERE id = $1 RETURNING id', [projectId]);
      
      if (deleteResult.rows.length === 0) {
        throw new Error('Project deletion failed - no rows affected');
      }
      
      console.log('✅ Deleted project');
      
      // Commit the transaction
      await query('COMMIT');
      
      res.json({
        success: true,
        message: `Project "${projectName}" deleted successfully`,
        deletedProjectId: parseInt(projectId)
      });
      
    } catch (deleteError) {
      // Rollback on any error
      await query('ROLLBACK');
      console.error('❌ Error during project deletion, transaction rolled back:', deleteError);
      throw deleteError;
    }
    
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('❌ Error deleting project:', error);
    throw new ApiError(`Failed to delete project: ${error.message}`, 500);
  }
};

const getProjectHistory = async (req, res) => {
  const projectId = req.params.id;
  
  console.log('🔍 getProjectHistory called with projectId:', projectId);
  
  // Basic validation
  if (!projectId || isNaN(projectId)) {
    console.error('❌ Invalid project ID:', projectId);
    throw new ApiError('Invalid project ID', 400);
  }
  
  try {
    // Check if project exists first
    console.log('🔍 Checking if project exists...');
    const existsQuery = 'SELECT id, name FROM projects WHERE id = $1';
    const existsResult = await query(existsQuery, [projectId]);
    
    if (existsResult.rows.length === 0) {
      console.error('❌ Project not found:', projectId);
      throw new ApiError('Project not found', 404);
    }
    
    console.log('✅ Project found:', existsResult.rows[0].name);
    
    // Get project history
    console.log('🔍 Fetching project history...');
    const historyQuery = `
      SELECT ph.*, u.name as user_name
      FROM project_history ph
      LEFT JOIN users u ON ph.user_id = u.id
      WHERE ph.project_id = $1
      ORDER BY ph.created_at DESC
    `;
    
    const historyResult = await query(historyQuery, [projectId]);
    console.log('📊 Found', historyResult.rows.length, 'history records');
    
    const formattedHistory = historyResult.rows.map(row => {
      console.log('🔄 Processing history row:', {
        id: row.id,
        action: row.action,
        user_name: row.user_name,
        created_at: row.created_at,
        details_type: typeof row.details,
        details_value: row.details
      });
      
      // Safe JSON parsing for details
      let parsedDetails = null;
      if (row.details) {
        try {
          // If it's already an object (JSONB), use it directly
          if (typeof row.details === 'object') {
            parsedDetails = row.details;
          } 
          // If it's a string, try to parse it
          else if (typeof row.details === 'string' && row.details !== '[object Object]') {
            parsedDetails = JSON.parse(row.details);
          }
          // If it's the problematic "[object Object]" string, ignore it
          else {
            console.warn('⚠️ Skipping invalid details value:', row.details);
            parsedDetails = null;
          }
        } catch (parseError) {
          console.warn('⚠️ Failed to parse details JSON for row', row.id, ':', parseError.message);
          parsedDetails = null;
        }
      }
      
      return {
        id: row.id,
        action: row.action,
        description: row.description,
        timestamp: row.created_at,
        user: row.user_name || 'System',
        type: row.action_type,
        details: parsedDetails
      };
    });
    
    console.log('✅ Successfully formatted', formattedHistory.length, 'history records');
    
    res.json({
      success: true,
      data: formattedHistory,
      count: formattedHistory.length
    });
    
  } catch (error) {
    console.error('❌ Detailed error in getProjectHistory:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    console.error('❌ Unknown error in getProjectHistory:', error);
    throw new ApiError(`Failed to fetch project history: ${error.message}`, 500);
  }
};

const submitFeedback = async (req, res) => {
  // This is now handled by the feedbackController
  // Redirect to the proper feedback endpoint
  const feedbackController = require('./feedbackController');
  return feedbackController.submitFeedback(req, res);
};

// Replace the placeholder comment functions in your projectController.js with these complete implementations:

const getProjectComments = async (req, res) => {
    const projectId = req.params.id;
    
    console.log('🔍 getProjectComments called with projectId:', projectId);
    
    // Basic validation
    if (!projectId || isNaN(projectId)) {
      console.error('❌ Invalid project ID:', projectId);
      throw new ApiError('Invalid project ID', 400);
    }
    
    try {
      // Check if project exists first
      const existsQuery = 'SELECT id, name FROM projects WHERE id = $1';
      const existsResult = await query(existsQuery, [projectId]);
      
      if (existsResult.rows.length === 0) {
        console.error('❌ Project not found:', projectId);
        throw new ApiError('Project not found', 404);
      }
      
      console.log('✅ Project found:', existsResult.rows[0].name);
      
      // Get project comments
      console.log('🔍 Fetching project comments...');
      const commentsQuery = `
        SELECT pc.*, u.name as user_name, u.avatar
        FROM project_comments pc
        LEFT JOIN users u ON pc.user_id = u.id
        WHERE pc.project_id = $1
        ORDER BY pc.created_at DESC
      `;
      
      const commentsResult = await query(commentsQuery, [projectId]);
      console.log('📊 Found', commentsResult.rows.length, 'comment records');
      
      const formattedComments = commentsResult.rows.map(row => ({
        id: row.id,
        content: row.content,
        author: row.user_name || 'Unknown User',
        avatar: row.avatar || row.user_name?.split(' ').map(n => n[0]).join('') || 'U',
        timestamp: row.created_at,
        type: 'comment',
        userId: row.user_id,
        projectId: row.project_id
      }));
      
      console.log('✅ Successfully formatted', formattedComments.length, 'comment records');
      
      res.json({
        success: true,
        data: formattedComments,
        count: formattedComments.length
      });
      
    } catch (error) {
      console.error('❌ Detailed error in getProjectComments:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      console.error('❌ Unknown error in getProjectComments:', error);
      throw new ApiError(`Failed to fetch project comments: ${error.message}`, 500);
    }
  };
  
  const addComment = async (req, res) => {
    const projectId = req.params.id;
    const { content, userId, userName } = req.body;
    
    console.log('📝 addComment called:', { projectId, content, userId, userName });
    
    // Basic validation
    if (!projectId || isNaN(projectId)) {
      throw new ApiError('Invalid project ID', 400);
    }
    
    if (!content || !content.trim()) {
      throw new ApiError('Comment content is required', 400);
    }
    
    try {
      // Check if project exists
      const existsQuery = 'SELECT id, name FROM projects WHERE id = $1';
      const existsResult = await query(existsQuery, [projectId]);
      
      if (existsResult.rows.length === 0) {
        throw new ApiError('Project not found', 404);
      }
      
      console.log('✅ Project found:', existsResult.rows[0].name);
      
      // Handle user - find by ID or name, or use fallback
      let finalUserId = null;
      let finalUserName = userName || 'Anonymous User';
      
      console.log('🔍 Processing user info:', { userId, userName, userIdType: typeof userId });
      
      // Case 1: Valid numeric user ID provided
      if (userId && !isNaN(parseInt(userId)) && parseInt(userId) > 0) {
        console.log('🔍 Trying to find user by numeric ID:', parseInt(userId));
        try {
          const userQuery = 'SELECT id, name FROM users WHERE id = $1';
          const userResult = await query(userQuery, [parseInt(userId)]);
          
          if (userResult.rows.length > 0) {
            finalUserId = userResult.rows[0].id;
            finalUserName = userResult.rows[0].name;
            console.log('✅ Found user by ID:', finalUserName);
          } else {
            console.log('⚠️ User ID not found in database:', parseInt(userId));
          }
        } catch (userError) {
          console.log('⚠️ Error finding user by ID:', userError.message);
        }
      } else {
        console.log('⚠️ Invalid or non-numeric user ID:', userId, typeof userId);
      }
      
      // Case 2: User name provided and no valid ID found
      if (!finalUserId && userName && userName !== 'Current User' && userName !== 'Anonymous User') {
        console.log('🔍 Trying to find user by name:', userName);
        try {
          const userQuery = 'SELECT id, name FROM users WHERE name ILIKE $1';
          const userResult = await query(userQuery, [userName]);
          
          if (userResult.rows.length > 0) {
            finalUserId = userResult.rows[0].id;
            finalUserName = userResult.rows[0].name;
            console.log('✅ Found user by name:', finalUserName);
          } else {
            console.log('⚠️ User name not found in database:', userName);
          }
        } catch (userError) {
          console.log('⚠️ Error finding user by name:', userError.message);
        }
      }
      
      // Case 3: No valid user found, use first available user as fallback
      // In your projectController.js addComment function, replace the entire fallback section:

// Case 3: No valid user found, use fallback ID but keep provided name
    if (!finalUserId) {
        console.log('🔄 No valid user found, using fallback user...');
        try {
        const fallbackQuery = 'SELECT id, name FROM users ORDER BY id LIMIT 1';
        const fallbackResult = await query(fallbackQuery);
        
        if (fallbackResult.rows.length > 0) {
            finalUserId = fallbackResult.rows[0].id;
            
            // ALWAYS use the provided userName if it exists and is meaningful
            if (userName && userName.trim() && userName !== 'Current User' && userName !== 'Anonymous User') {
            finalUserName = userName.trim();
            console.log('✅ Using fallback ID but KEEPING provided name:', finalUserName);
            } else {
            finalUserName = fallbackResult.rows[0].name;
            console.log('✅ Using fallback user name from database:', finalUserName);
            }
            
            console.log('📝 Final user details for comment:', { finalUserId, finalUserName });
        } else {
            throw new ApiError('No users available in system', 500);
        }
        } catch (fallbackError) {
        console.error('❌ Error getting fallback user:', fallbackError);
        throw new ApiError('No users available in system', 500);
        }
    }
    
    // Ensure we have valid user data before proceeding
    if (!finalUserId || !finalUserName) {
        console.error('❌ No valid user found after all attempts');
        throw new ApiError('Unable to identify user for comment', 400);
    }
      
      console.log('📝 Final user details for comment:', { finalUserId, finalUserName });
      
      // Insert the comment
      const insertQuery = `
        INSERT INTO project_comments (project_id, user_id, content)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      
      console.log('📝 Inserting comment with values:', [projectId, finalUserId, content.trim()]);
      
      const result = await query(insertQuery, [projectId, finalUserId, content.trim()]);
      const newComment = result.rows[0];
      
      console.log('✅ Comment created with ID:', newComment.id);
      
      // Add to project history
      const historyQuery = `
        INSERT INTO project_history (project_id, user_id, action, description, action_type, details)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      await query(historyQuery, [
        projectId,
        finalUserId,
        'Comment Added',
        `${finalUserName} added a comment: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
        'comment',
        JSON.stringify({ 
          commentId: newComment.id,
          commentLength: content.length 
        })
      ]);
      
      console.log('✅ Comment history added');
      
      // Return formatted comment
      const formattedComment = {
        id: newComment.id,
        content: newComment.content,
        author: finalUserName,
        avatar: finalUserName?.split(' ').map(n => n[0]).join('') || 'U',
        timestamp: newComment.created_at,
        type: 'comment',
        userId: finalUserId,
        projectId: parseInt(projectId)
      };
      
      res.status(201).json({
        success: true,
        data: formattedComment,
        message: 'Comment added successfully'
      });
      
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('❌ Error adding comment:', error);
      throw new ApiError('Failed to add comment', 500);
    }
  };
  
  const updateComment = async (req, res) => {
    const projectId = req.params.id;
    const commentId = req.params.commentId;
    const { content, userId, userName } = req.body;
    
    console.log('📝 updateComment called:', { projectId, commentId, content, userId, userName });
    
    // Basic validation
    if (!projectId || isNaN(projectId)) {
      throw new ApiError('Invalid project ID', 400);
    }
    
    if (!commentId || isNaN(commentId)) {
      throw new ApiError('Invalid comment ID', 400);
    }
    
    if (!content || !content.trim()) {
      throw new ApiError('Comment content is required', 400);
    }
    
    try {
      // Check if comment exists and belongs to the project
      const commentQuery = `
        SELECT pc.*, u.name as user_name 
        FROM project_comments pc
        LEFT JOIN users u ON pc.user_id = u.id
        WHERE pc.id = $1 AND pc.project_id = $2
      `;
      const commentResult = await query(commentQuery, [commentId, projectId]);
      
      if (commentResult.rows.length === 0) {
        throw new ApiError('Comment not found', 404);
      }
      
      const existingComment = commentResult.rows[0];
      console.log('📝 Existing comment details:', {
        commentId: existingComment.id,
        commentUserId: existingComment.user_id,
        commentUserName: existingComment.user_name,
        requestUserId: userId,
        requestUserName: userName
      });
      
      // SIMPLIFIED PERMISSION CHECK - Allow all updates for now
      let canEdit = true;
      
      // Optional: Add stricter permission checking here if needed
      /*
      if (userId && !isNaN(parseInt(userId)) && parseInt(userId) > 0) {
        canEdit = existingComment.user_id === parseInt(userId);
        console.log('🔍 Permission check:', { 
          existingUserId: existingComment.user_id, 
          requestUserId: parseInt(userId), 
          match: canEdit 
        });
      } else {
        // Try to match by name if no valid ID
        if (userName && userName.trim()) {
          canEdit = existingComment.user_name === userName.trim();
          console.log('🔍 Name-based permission check:', {
            existingUserName: existingComment.user_name,
            requestUserName: userName.trim(),
            match: canEdit
          });
        }
      }
      */
      
      if (!canEdit) {
        console.log('❌ Permission denied for comment edit');
        throw new ApiError('You can only edit your own comments', 403);
      }
      
      console.log('✅ Permission granted for comment edit');
      
      // Update the comment
      const updateQuery = `
        UPDATE project_comments 
        SET content = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND project_id = $3
        RETURNING *
      `;
      
      const result = await query(updateQuery, [content.trim(), commentId, projectId]);
      const updatedComment = result.rows[0];
      
      console.log('✅ Comment updated:', updatedComment.id);
      
      // Add to project history
      const historyQuery = `
        INSERT INTO project_history (project_id, user_id, action, description, action_type, details)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      await query(historyQuery, [
        projectId,
        existingComment.user_id,
        'Comment Updated',
        `${existingComment.user_name} updated a comment`,
        'comment',
        JSON.stringify({ 
          commentId: parseInt(commentId),
          action: 'updated'
        })
      ]);
      
      console.log('✅ Comment history added');
      
      // Return formatted comment
      const formattedComment = {
        id: updatedComment.id,
        content: updatedComment.content,
        author: existingComment.user_name,
        avatar: existingComment.user_name?.split(' ').map(n => n[0]).join('') || 'U',
        timestamp: updatedComment.updated_at || updatedComment.created_at,
        type: 'comment',
        userId: updatedComment.user_id,
        projectId: parseInt(projectId)
      };
      
      res.json({
        success: true,
        data: formattedComment,
        message: 'Comment updated successfully'
      });
      
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('❌ Error updating comment:', error);
      throw new ApiError('Failed to update comment', 500);
    }
  };
  
  const deleteComment = async (req, res) => {
    const projectId = req.params.id;
    const commentId = req.params.commentId;
    const { userId, userName } = req.body || {};
    
    console.log('🗑️ deleteComment called:', { projectId, commentId, userId, userName });
    
    // Basic validation
    if (!projectId || isNaN(projectId)) {
      throw new ApiError('Invalid project ID', 400);
    }
    
    if (!commentId || isNaN(commentId)) {
      throw new ApiError('Invalid comment ID', 400);
    }
    
    try {
      // Check if comment exists and belongs to the project
      const commentQuery = `
        SELECT pc.*, u.name as user_name 
        FROM project_comments pc
        LEFT JOIN users u ON pc.user_id = u.id
        WHERE pc.id = $1 AND pc.project_id = $2
      `;
      const commentResult = await query(commentQuery, [commentId, projectId]);
      
      if (commentResult.rows.length === 0) {
        throw new ApiError('Comment not found', 404);
      }
      
      const existingComment = commentResult.rows[0];
      console.log('🗑️ Existing comment for deletion:', {
        commentId: existingComment.id,
        commentUserId: existingComment.user_id,
        commentUserName: existingComment.user_name
      });
      
      // IMPROVED PERMISSION CHECK (same as update)
      let canDelete = true; // For demo, allow all deletions
      
      // In production, you'd check permissions here like in updateComment
      
      if (!canDelete) {
        throw new ApiError('You can only delete your own comments', 403);
      }
      
      // Delete the comment
      const deleteQuery = 'DELETE FROM project_comments WHERE id = $1 AND project_id = $2';
      await query(deleteQuery, [commentId, projectId]);
      
      console.log('✅ Comment deleted:', commentId);
      
      // Add to project history
      const historyQuery = `
        INSERT INTO project_history (project_id, user_id, action, description, action_type, details)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      await query(historyQuery, [
        projectId,
        existingComment.user_id,
        'Comment Deleted',
        `${existingComment.user_name} deleted a comment`,
        'comment',
        JSON.stringify({ 
          commentId: parseInt(commentId),
          action: 'deleted',
          originalContent: existingComment.content.substring(0, 50)
        })
      ]);
      
      res.json({
        success: true,
        message: 'Comment deleted successfully',
        deletedCommentId: parseInt(commentId)
      });
      
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('❌ Error deleting comment:', error);
      throw new ApiError('Failed to delete comment', 500);
    }
  };

  const getProjectTeam = async (req, res) => {
    res.status(501).json({ message: 'Get project team - Coming soon' });
  };
  
  const addTeamMember = async (req, res) => {
    res.status(501).json({ message: 'Add team member - Coming soon' });
  };
  
  const removeTeamMember = async (req, res) => {
    res.status(501).json({ message: 'Remove team member - Coming soon' });
  };
  
  
  // Update your module.exports at the end of projectController.js to include all functions:
  module.exports = {
    getAllProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    getProjectHistory,
    submitFeedback,
    getProjectComments,
    addComment,
    updateComment,  // Make sure this is included
    deleteComment,  // Make sure this is included
    getProjectTeam,
    addTeamMember,
    removeTeamMember
  };
