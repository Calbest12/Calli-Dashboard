// backend/server.js - FIXED VERSION WITH DATABASE INTEGRATION

const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./src/middleware/errorHandler');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

console.log('🚀 Starting Server on port', PORT);

// Basic middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Load routes from src directory - DATABASE CONNECTED ROUTES
try {
  const authRoutes = require('./src/routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes loaded from src/routes/auth (DATABASE)');
} catch (error) {
  console.error('❌ Auth routes failed to load:', error.message);
  console.error('Stack:', error.stack);
}

try {
  const projectRoutes = require('./src/routes/projects');
  app.use('/api/projects', projectRoutes);
  console.log('✅ Project routes loaded from src/routes/projects (DATABASE)');
} catch (error) {
  console.error('❌ Project routes failed to load:', error.message);
  console.error('Stack:', error.stack);
}

try {
  const userRoutes = require('./src/routes/users');
  app.use('/api/users', userRoutes);
  console.log('✅ User routes loaded from src/routes/users (DATABASE)');
} catch (error) {
  console.error('❌ User routes failed to load:', error.message);
  console.error('Stack:', error.stack);
}

try {
  // FIXED: Changed from './routes/team' to './src/routes/team'
  const teamRoutes = require('./src/routes/team');
  app.use('/api/projects', teamRoutes);
  console.log('✅ Team routes loaded from src/routes/team (DATABASE)');
} catch (error) {
  console.error('❌ Team routes failed to load:', error.message);
  console.error('Stack:', error.stack);
}

try {
  const aiRoutes = require('./src/routes/ai');
  app.use('/api/ai', aiRoutes);
  console.log('✅ AI routes loaded from src/routes/ai (DATABASE)');
} catch (error) {
  console.error('❌ AI routes failed to load:', error.message);
  console.error('Stack:', error.stack);
}

try {
  const careerRoutes = require('./src/routes/career');
  app.use('/api/career', careerRoutes);
  console.log('✅ Career routes loaded from src/routes/career (DATABASE)');
} catch (error) {
  console.error('❌ Career routes failed to load:', error.message);
  console.error('Stack:', error.stack);
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Error handler
app.use(errorHandler);

// Test database connection and verify tables
const testDatabase = async () => {
  try {
    const { query } = require('./src/config/database');
    
    // Test connection
    const result = await query('SELECT NOW() as time');
    console.log('✅ Database connected:', result.rows[0].time);
    
    // Verify project_manager database tables exist
    const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📊 Available database tables:', tables.rows.map(row => row.table_name));
    
    // Check if main tables exist
    const tableNames = tables.rows.map(row => row.table_name);
    const requiredTables = ['users', 'projects', 'project_team_members', 'project_history'];
    
    requiredTables.forEach(table => {
      if (tableNames.includes(table)) {
        console.log(`✅ Table '${table}' exists`);
      } else {
        console.warn(`⚠️ Table '${table}' not found`);
      }
    });
    
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('🚫 Server cannot start without database connection');
    process.exit(1); // Exit if database is not available
  }
};

// Start server
app.listen(PORT, async () => {
  console.log('');
  console.log('🎉 SERVER STARTING...');
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
  console.log(`🔑 Auth: http://localhost:${PORT}/api/auth/login`);
  console.log('');
  
  // Test database connection - REQUIRED
  console.log('🔍 Testing connection to project_manager database...');
  await testDatabase();
  
  console.log('');
  console.log('✅ SERVER RUNNING WITH DATABASE CONNECTION');
  console.log('🔍 All data will be stored in project_manager database');
  console.log('✅ Ready for requests!');
});

module.exports = app;