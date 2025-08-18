const { query, withTransaction } = require('../config/database');
const { ApiError } = require('../middleware/errorHandler');

// Helper function to update project progress based on feedback
const updateProjectProgressFromFeedback = async (projectId) => {
  try {
    console.log('🔄 Recalculating project progress from feedback...');
    
    // Get all feedback for this project
    const feedbackQuery = `
      SELECT pm_average, leadership_average, change_mgmt_average, career_dev_average
      FROM project_feedback 
      WHERE project_id = $1
    `;
    const feedbackResult = await query(feedbackQuery, [projectId]);
    
    if (feedbackResult.rows.length > 0) {
      // Calculate averages from all feedback
      const totalFeedback = feedbackResult.rows.length;
      const totals = feedbackResult.rows.reduce((acc, feedback) => ({
        PM: acc.PM + (feedback.pm_average || 0),
        Leadership: acc.Leadership + (feedback.leadership_average || 0),
        ChangeMgmt: acc.ChangeMgmt + (feedback.change_mgmt_average || 0),
        CareerDev: acc.CareerDev + (feedback.career_dev_average || 0)
      }), { PM: 0, Leadership: 0, ChangeMgmt: 0, CareerDev: 0 });
      
      const newProgress = {
        PM: Math.round(totals.PM / totalFeedback),
        Leadership: Math.round(totals.Leadership / totalFeedback),
        ChangeMgmt: Math.round(totals.ChangeMgmt / totalFeedback),
        CareerDev: Math.round(totals.CareerDev / totalFeedback)
      };
      
      // Update project progress
      const updateQuery = `
        UPDATE projects 
        SET pm_progress = $1, leadership_progress = $2, change_mgmt_progress = $3, career_dev_progress = $4, updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
      `;
      
      await query(updateQuery, [
        newProgress.PM,
        newProgress.Leadership, 
        newProgress.ChangeMgmt,
        newProgress.CareerDev,
        projectId
      ]);
      
      console.log('✅ Project progress updated:', newProgress);
    }
  } catch (error) {
    console.error('❌ Error updating project progress:', error);
  }
};

// Replace the submitFeedback function in feedbackController.js with this working version:

const submitFeedback = async (req, res) => {
    console.log('🎯 Feedback submission started');
    console.log('🔍 req.params:', req.params);
    console.log('🔍 req.body:', req.body);
    
    const projectId = req.params.id;
    
    // Basic validation
    if (!projectId || isNaN(projectId)) {
      console.error('❌ Invalid project ID:', projectId);
      return res.status(400).json({
        success: false,
        error: 'Invalid project ID'
      });
    }
    
    try {
      // Extract data directly from request body since it's sent flat
      const {
        userName,
        currentUser,
        // PM feedback
        PM_Vision,
        PM_Time,
        PM_Quality,
        PM_Cost,
        // Leadership feedback
        Leadership_Vision,
        Leadership_Reality,
        Leadership_Ethics,
        Leadership_Courage,
        // Change Management feedback
        ChangeMgmt_Alignment,
        ChangeMgmt_Understand,
        ChangeMgmt_Enact,
        // Career Development feedback
        CareerDev_KnowYourself,
        CareerDev_KnowYourMarket,
        CareerDev_TellYourStory,
        ...otherProps
      } = req.body;
      
      console.log('📝 Processing feedback for project:', projectId);
      console.log('📝 Extracted userName:', userName);
      
      // Build data object from flat structure
      const data = {
        PM_Vision: PM_Vision || 0,
        PM_Time: PM_Time || 0,
        PM_Quality: PM_Quality || 0,
        PM_Cost: PM_Cost || 0,
        Leadership_Vision: Leadership_Vision || 0,
        Leadership_Reality: Leadership_Reality || 0,
        Leadership_Ethics: Leadership_Ethics || 0,
        Leadership_Courage: Leadership_Courage || 0,
        ChangeMgmt_Alignment: ChangeMgmt_Alignment || 0,
        ChangeMgmt_Understand: ChangeMgmt_Understand || 0,
        ChangeMgmt_Enact: ChangeMgmt_Enact || 0,
        CareerDev_KnowYourself: CareerDev_KnowYourself || 0,
        CareerDev_KnowYourMarket: CareerDev_KnowYourMarket || 0,
        CareerDev_TellYourStory: CareerDev_TellYourStory || 0
      };
      
      // Calculate averages from the data
      const averages = {
        PM: Math.round(((data.PM_Vision + data.PM_Time + data.PM_Quality + data.PM_Cost) / 4) * 100) / 100,
        Leadership: Math.round(((data.Leadership_Vision + data.Leadership_Reality + data.Leadership_Ethics + data.Leadership_Courage) / 4) * 100) / 100,
        ChangeMgmt: Math.round(((data.ChangeMgmt_Alignment + data.ChangeMgmt_Understand + data.ChangeMgmt_Enact) / 3) * 100) / 100,
        CareerDev: Math.round(((data.CareerDev_KnowYourself + data.CareerDev_KnowYourMarket + data.CareerDev_TellYourStory) / 3) * 100) / 100
      };
      
      console.log('📝 Built data object:', data);
      console.log('📝 Calculated averages:', averages);
      
      // Use userName from request body, fallback to currentUser if available
      const submitterName = userName || currentUser?.name || 'Anonymous User';
      console.log('📝 Final submitter name:', submitterName);
      
      // Check if project exists
      console.log('🔍 Checking if project exists...');
      const projectExistsQuery = 'SELECT id, name FROM projects WHERE id = $1';
      const projectResult = await query(projectExistsQuery, [projectId]);
      
      if (projectResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }
      
      console.log('✅ Project found:', projectResult.rows[0].name);
      
      // Find user by name (optional)
      let userId = null;
      if (submitterName && submitterName !== 'Anonymous User') {
        const userQuery = 'SELECT id FROM users WHERE name = $1';
        const userResult = await query(userQuery, [submitterName]);
        
        if (userResult.rows.length > 0) {
          userId = userResult.rows[0].id;
          console.log('✅ User found:', submitterName);
        } else {
          console.warn(`⚠️ User not found: ${submitterName}, proceeding with anonymous feedback`);
        }
      }
      
      // Insert feedback into database
      console.log('💾 Inserting feedback into database...');
      const feedbackQuery = `
        INSERT INTO project_feedback (
          project_id, user_id, 
          pm_vision, pm_time, pm_quality, pm_cost,
          leadership_vision, leadership_reality, leadership_ethics, leadership_courage,
          change_mgmt_alignment, change_mgmt_understand, change_mgmt_enact,
          career_dev_know_yourself, career_dev_know_market, career_dev_tell_story,
          pm_average, leadership_average, change_mgmt_average, career_dev_average
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
        ) RETURNING *
      `;
      
      const feedbackValues = [
        projectId,
        userId,
        // PM feedback
        data.PM_Vision || 0,
        data.PM_Time || 0, 
        data.PM_Quality || 0,
        data.PM_Cost || 0,
        // Leadership feedback
        data.Leadership_Vision || 0,
        data.Leadership_Reality || 0,
        data.Leadership_Ethics || 0,
        data.Leadership_Courage || 0,
        // Change Management feedback
        data.ChangeMgmt_Alignment || 0,
        data.ChangeMgmt_Understand || 0,
        data.ChangeMgmt_Enact || 0,
        // Career Development feedback
        data.CareerDev_KnowYourself || 0,
        data.CareerDev_KnowYourMarket || 0,
        data.CareerDev_TellYourStory || 0,
        // Averages
        averages.PM || 0,
        averages.Leadership || 0,
        averages.ChangeMgmt || 0,
        averages.CareerDev || 0
      ];
      
      const feedbackResult = await query(feedbackQuery, feedbackValues);
      const savedFeedback = feedbackResult.rows[0];
      
      console.log('✅ Feedback saved with ID:', savedFeedback.id);
      
      // Add to project history
      console.log('📝 Adding to project history...');
      const historyQuery = `
        INSERT INTO project_history (project_id, user_id, action, description, action_type, details)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      const overallRating = ((averages.PM + averages.Leadership + averages.ChangeMgmt + averages.CareerDev) / 4 / 7 * 100).toFixed(1);
      
      await query(historyQuery, [
        projectId,
        userId,
        'Feedback Submitted',
        `${submitterName} submitted project feedback with ${overallRating}% overall rating`,
        'feedback_submitted',
        JSON.stringify({ 
          overallRating: overallRating + '%',
          averages: averages 
        })
      ]);
      
      console.log('✅ Project history updated');
      
      // Recalculate project progress based on all feedback
      console.log('🔄 Updating project progress...');
      await updateProjectProgressFromFeedback(projectId);
      console.log('✅ Project progress updated');
      
      // Format response
      const formattedFeedback = {
        id: savedFeedback.id,
        projectId: savedFeedback.project_id,
        userId: savedFeedback.user_id,
        userName: submitterName,
        timestamp: savedFeedback.created_at,
        data: {
          PM_Vision: savedFeedback.pm_vision,
          PM_Time: savedFeedback.pm_time,
          PM_Quality: savedFeedback.pm_quality,
          PM_Cost: savedFeedback.pm_cost,
          Leadership_Vision: savedFeedback.leadership_vision,
          Leadership_Reality: savedFeedback.leadership_reality,
          Leadership_Ethics: savedFeedback.leadership_ethics,
          Leadership_Courage: savedFeedback.leadership_courage,
          ChangeMgmt_Alignment: savedFeedback.change_mgmt_alignment,
          ChangeMgmt_Understand: savedFeedback.change_mgmt_understand,
          ChangeMgmt_Enact: savedFeedback.change_mgmt_enact,
          CareerDev_KnowYourself: savedFeedback.career_dev_know_yourself,
          CareerDev_KnowYourMarket: savedFeedback.career_dev_know_market,
          CareerDev_TellYourStory: savedFeedback.career_dev_tell_story
        },
        averages: {
          PM: savedFeedback.pm_average,
          Leadership: savedFeedback.leadership_average,
          ChangeMgmt: savedFeedback.change_mgmt_average,
          CareerDev: savedFeedback.career_dev_average
        }
      };
      
      res.status(201).json({
        success: true,
        data: formattedFeedback,
        message: 'Feedback submitted successfully'
      });
      
    } catch (error) {
      console.error('❌ Error submitting feedback:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit feedback: ' + error.message
      });
    }
  };

// Get all feedback for a project
const getProjectFeedback = async (req, res) => {
  const projectId = req.params.id; // Changed from projectId to id to match route
  
  if (!projectId || isNaN(projectId)) {
    throw new ApiError('Invalid project ID', 400);
  }
  
  try {
    const feedbackQuery = `
      SELECT pf.*, u.name as user_name
      FROM project_feedback pf
      LEFT JOIN users u ON pf.user_id = u.id
      WHERE pf.project_id = $1
      ORDER BY pf.created_at DESC
    `;
    
    const result = await query(feedbackQuery, [projectId]);
    
    const feedback = result.rows.map(f => ({
      id: f.id,
      projectId: f.project_id,
      userId: f.user_id,
      userName: f.user_name || 'Anonymous',
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
    
    res.json({
      success: true,
      data: feedback,
      count: feedback.length
    });
    
  } catch (error) {
    console.error('❌ Error fetching project feedback:', error);
    throw new ApiError('Failed to fetch project feedback', 500);
  }
};

// Delete feedback (admin only)
const deleteFeedback = async (req, res) => {
  const feedbackId = req.params.feedbackId;
  
  if (!feedbackId || isNaN(feedbackId)) {
    throw new ApiError('Invalid feedback ID', 400);
  }
  
  try {
    const deleteQuery = 'DELETE FROM project_feedback WHERE id = $1 RETURNING *';
    const result = await query(deleteQuery, [feedbackId]);
    
    if (result.rows.length === 0) {
      throw new ApiError('Feedback not found', 404);
    }
    
    res.json({
      success: true,
      message: 'Feedback deleted successfully'
    });
    
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('❌ Error deleting feedback:', error);
    throw new ApiError('Failed to delete feedback', 500);
  }
};

module.exports = {
  submitFeedback,
  getProjectFeedback,
  deleteFeedback
};