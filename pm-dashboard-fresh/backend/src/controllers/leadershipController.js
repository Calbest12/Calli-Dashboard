const db = require('../config/database');

const validateDiamondScores = (scores) => {
  const { task_score, team_score, individual_score, organization_score } = scores;
  
  const requiredScores = [task_score, team_score, individual_score, organization_score];
  
  for (const score of requiredScores) {
    if (score === undefined || score === null) {
      return { valid: false, message: 'All scores are required' };
    }
    if (typeof score !== 'number' || score < 1 || score > 10) {
      return { valid: false, message: 'All scores must be numbers between 1 and 10' };
    }
  }
  
  return { valid: true };
};

const validateValueScores = (scores) => {
  const { vision_score, alignment_score, understanding_score, enactment_score } = scores;
  
  const requiredScores = [vision_score, alignment_score, understanding_score, enactment_score];
  
  for (const score of requiredScores) {
    if (score === undefined || score === null) {
      return { valid: false, message: 'All scores are required' };
    }
    if (typeof score !== 'number' || score < 1 || score > 10) {
      return { valid: false, message: 'All scores must be numbers between 1 and 10' };
    }
  }
  
  return { valid: true };
};

// DIAMOND ASSESSMENT CONTROLLERS
const createDiamondAssessment = async (req, res) => {
  try {
    console.log('ðŸ’Ž Creating Diamond assessment:', req.body);
    
    const { user_id, task_score, team_score, individual_score, organization_score, responses } = req.body;
    
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required'
      });
    }

    const validation = validateDiamondScores({ task_score, team_score, individual_score, organization_score });
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    const query = `
      INSERT INTO leadership_diamond_assessments 
      (user_id, task_score, team_score, individual_score, organization_score, responses, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, user_id, task_score, team_score, individual_score, organization_score, created_at
    `;
    
    const values = [
      user_id, 
      task_score, 
      team_score, 
      individual_score, 
      organization_score, 
      typeof responses === 'string' ? responses : JSON.stringify(responses || {})
    ];
    
    console.log('ðŸ“ SQL Query:', query);
    console.log('ðŸ“ Values:', values);
    
    const result = await db.query(query, values);
    const assessment = result.rows[0];
    
    console.log('âœ… Diamond assessment created:', assessment);
    
    res.status(201).json({
      success: true,
      message: 'Diamond assessment created successfully',
      data: assessment
    });
    
  } catch (error) {
    console.error('âŒ Error in createDiamondAssessment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create Diamond assessment',
      error: error.message
    });
  }
};

const getDiamondAssessments = async (req, res) => {
  try {
    const { user_id } = req.query;
    
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id query parameter is required'
      });
    }

    console.log('ðŸ’Ž Getting Diamond assessments for user:', user_id);

    const query = `
      SELECT id, user_id, task_score, team_score, individual_score, organization_score, responses, created_at
      FROM leadership_diamond_assessments 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `;
    
    console.log('ðŸ“ SQL Query:', query);
    console.log('ðŸ“ User ID:', user_id);
    
    const result = await db.query(query, [user_id]);
    const assessments = result.rows;
    
    console.log(`âœ… Found ${assessments.length} Diamond assessments`);
    
    res.json({
      success: true,
      data: assessments
    });
    
  } catch (error) {
    console.error('âŒ Error in getDiamondAssessments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get Diamond assessments',
      error: error.message
    });
  }
};

// VALUE ASSESSMENT CONTROLLERS
const createValueAssessment = async (req, res) => {
  try {
    console.log('ðŸŽ¯ Creating VALUE assessment:', req.body);
    
    const { user_id, vision_score, alignment_score, understanding_score, enactment_score, responses } = req.body;
    
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required'
      });
    }

    const validation = validateValueScores({ vision_score, alignment_score, understanding_score, enactment_score });
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    const query = `
      INSERT INTO value_assessments 
      (user_id, vision_score, alignment_score, understanding_score, enactment_score, responses, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, user_id, vision_score, alignment_score, understanding_score, enactment_score, created_at
    `;
    
    const values = [
      user_id, 
      vision_score, 
      alignment_score, 
      understanding_score, 
      enactment_score, 
      typeof responses === 'string' ? responses : JSON.stringify(responses || {})
    ];
    
    console.log('ðŸ“ SQL Query:', query);
    console.log('ðŸ“ Values:', values);
    
    const result = await db.query(query, values);
    const assessment = result.rows[0];
    
    console.log('âœ… VALUE assessment created:', assessment);
    
    res.status(201).json({
      success: true,
      message: 'VALUE assessment created successfully',
      data: assessment
    });
    
  } catch (error) {
    console.error('âŒ Error in createValueAssessment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create VALUE assessment',
      error: error.message
    });
  }
};

const getValueAssessments = async (req, res) => {
  try {
    const { user_id } = req.query;
    
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id query parameter is required'
      });
    }

    console.log('ðŸŽ¯ Getting VALUE assessments for user:', user_id);

    const query = `
      SELECT id, user_id, vision_score, alignment_score, understanding_score, enactment_score, responses, created_at
      FROM value_assessments 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `;
    
    console.log('ðŸ“ SQL Query:', query);
    console.log('ðŸ“ User ID:', user_id);
    
    const result = await db.query(query, [user_id]);
    const assessments = result.rows;
    
    console.log(`âœ… Found ${assessments.length} VALUE assessments`);
    
    res.json({
      success: true,
      data: assessments
    });
    
  } catch (error) {
    console.error('âŒ Error in getValueAssessments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get VALUE assessments',
      error: error.message
    });
  }
};

// HEALTH CHECK
const healthCheck = (req, res) => {
  res.json({
    success: true,
    message: 'Leadership service is healthy',
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  createDiamondAssessment,
  getDiamondAssessments,
  createValueAssessment,
  getValueAssessments,
  healthCheck
};