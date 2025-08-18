// historyController.js - Complete implementation for project history
const ProjectHistory = require('../models/ProjectHistory'); // Adjust path as needed
const Project = require('../models/Project'); // Adjust path as needed

/**
 * Get project history by project ID
 * @route GET /api/projects/:id/history
 */
const getProjectHistory = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📊 Getting history for project ID:', id);

    // Validate project ID format (adjust based on your ID format)
    if (!id || (typeof id === 'string' && id.trim() === '')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid project ID provided'
      });
    }

    // Check if project exists first - this prevents the 404 error
    let project;
    try {
      // Adjust this query based on your ORM/database setup
      project = await Project.findById(id);
      // OR if using raw SQL: project = await db.query('SELECT * FROM projects WHERE id = ?', [id]);
      // OR if using Sequelize: project = await Project.findByPk(id);
    } catch (dbError) {
      console.error('❌ Database error finding project:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Database error while finding project'
      });
    }

    if (!project) {
      console.log('⚠️ Project not found with ID:', id);
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    console.log('✅ Project found:', project.name || project.title || `ID: ${project.id}`);

    // Get history records for this project
    let history;
    try {
      // Adjust based on your database schema
      history = await ProjectHistory.find({ projectId: id })
        .sort({ timestamp: -1 }) // Most recent first
        .limit(50); // Limit to prevent huge responses

      // OR if using raw SQL:
      // history = await db.query(`
      //   SELECT * FROM project_history 
      //   WHERE project_id = ? 
      //   ORDER BY timestamp DESC 
      //   LIMIT 50
      // `, [id]);

      // OR if using Sequelize:
      // history = await ProjectHistory.findAll({
      //   where: { projectId: id },
      //   order: [['timestamp', 'DESC']],
      //   limit: 50
      // });

      console.log(`✅ Found ${history.length} history entries for project ${id}`);
    } catch (historyError) {
      console.error('❌ Error fetching project history:', historyError);
      return res.status(500).json({
        success: false,
        error: 'Error fetching project history'
      });
    }

    // Format the response data
    const formattedHistory = history.map(entry => ({
      id: entry.id || entry._id,
      action: entry.action,
      description: entry.description,
      type: entry.type,
      user: entry.user || entry.userName || 'System',
      timestamp: entry.timestamp || entry.createdAt,
      details: entry.details || {}
    }));

    res.json({
      success: true,
      data: formattedHistory,
      projectId: id,
      projectName: project.name || project.title,
      total: formattedHistory.length
    });

  } catch (error) {
    console.error('❌ Unexpected error in getProjectHistory:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Add a new history entry
 * @route POST /api/projects/:id/history
 */
const addProjectHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, description, type, user, details } = req.body;

    console.log('📝 Adding history entry for project:', id);

    // Validate required fields
    if (!action || !type || !user) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: action, type, or user'
      });
    }

    // Check if project exists
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Create new history entry
    const historyEntry = await ProjectHistory.create({
      projectId: id,
      action,
      description: description || action,
      type,
      user,
      details: details || {},
      timestamp: new Date()
    });

    console.log('✅ History entry created:', historyEntry.id);

    res.status(201).json({
      success: true,
      data: historyEntry
    });

  } catch (error) {
    console.error('❌ Error adding project history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add history entry'
    });
  }
};

/**
 * Get project history with filtering and pagination
 * @route GET /api/projects/:id/history/filtered
 */
const getFilteredProjectHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      type, 
      user, 
      limit = 20, 
      offset = 0, 
      startDate, 
      endDate 
    } = req.query;

    // Check if project exists
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Build query filters
    const filters = { projectId: id };
    
    if (type) filters.type = type;
    if (user) filters.user = user;
    if (startDate && endDate) {
      filters.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Get filtered history
    const history = await ProjectHistory.find(filters)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await ProjectHistory.countDocuments(filters);

    res.json({
      success: true,
      data: history,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
      }
    });

  } catch (error) {
    console.error('❌ Error getting filtered history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get filtered history'
    });
  }
};

module.exports = {
  getProjectHistory,
  addProjectHistory,
  getFilteredProjectHistory
};