const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./src/config/config');
const { query } = require('./src/config/database');

// Import routes
const apiRoutes = require('./src/routes/index'); // Main API router
const authRoutes = require('./src/routes/auth');
const projectRoutes = require('./src/routes/projects');
const userRoutes = require('./src/routes/users');
const careerRoutes = require('./src/routes/career');
const teamRoutes = require('./src/routes/team');
const teamManagementRoutes = require('./src/routes/teamManagement');
const leadershipRoutes = require('./src/routes/leadership');
const aiRoutes = require('./src/routes/ai');

// Import middleware - FIXED TYPO AND DESTRUCTURING
const { errorHandler } = require('./src/middleware/errorHandler'); // Fixed: destructure errorHandler
const asyncHandler = require('./src/middleware/asyncHandler');     // Fixed: typo in middleware

// Rate limiting setup
let rateLimiter;
try {
  const rateLimit = require('express-rate-limit');
  rateLimiter = rateLimit({
    windowMs: config.rateLimit?.windowMs || 15 * 60 * 1000, // 15 minutes
    max: config.rateLimit?.max || 100, // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Only apply rate limiting in production
    skip: (req) => config.nodeEnv === 'development'
  });
} catch (error) {
  console.log('⚠️ Rate limiter not available, using fallback');
  rateLimiter = (req, res, next) => next();
}

const app = express();

// Trust proxy settings (needed for rate limiting and proper IP detection)
if (config.nodeEnv === 'production') {
  app.set('trust proxy', 1); // Trust first proxy
} else {
  app.set('trust proxy', true); // Trust all proxies in development
}

// CORS configuration
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  optionsSuccessStatus: 200
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security middleware
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  next();
});

// Apply rate limiting
app.use(rateLimiter);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes - ADD ERROR HANDLING FOR EACH ROUTE
try {
  if (apiRoutes && typeof apiRoutes === 'function') {
    app.use('/api', apiRoutes);
    console.log('✅ API routes loaded');
  } else {
    console.log('❌ API routes invalid:', typeof apiRoutes);
  }
} catch (e) {
  console.log('❌ API routes error:', e.message);
}

try {
  if (authRoutes && typeof authRoutes === 'function') {
    app.use('/api/auth', authRoutes);
    console.log('✅ Auth routes loaded');
  } else {
    console.log('❌ Auth routes invalid:', typeof authRoutes);
  }
} catch (e) {
  console.log('❌ Auth routes error:', e.message);
}

try {
  if (projectRoutes && typeof projectRoutes === 'function') {
    app.use('/api/projects', projectRoutes);
    console.log('✅ Project routes loaded');
  } else {
    console.log('❌ Project routes invalid:', typeof projectRoutes);
  }
} catch (e) {
  console.log('❌ Project routes error:', e.message);
}

try {
  if (userRoutes && typeof userRoutes === 'function') {
    app.use('/api/users', userRoutes);
    console.log('✅ User routes loaded');
  } else {
    console.log('❌ User routes invalid:', typeof userRoutes);
  }
} catch (e) {
  console.log('❌ User routes error:', e.message);
}

try {
  if (careerRoutes && typeof careerRoutes === 'function') {
    app.use('/api/career', careerRoutes);
    console.log('✅ Career routes loaded');
  } else {
    console.log('❌ Career routes invalid:', typeof careerRoutes);
  }
} catch (e) {
  console.log('❌ Career routes error:', e.message);
}

try {
  if (teamRoutes && typeof teamRoutes === 'function') {
    app.use('/api/team', teamRoutes);
    console.log('✅ Team routes loaded');
  } else {
    console.log('❌ Team routes invalid:', typeof teamRoutes);
  }
} catch (e) {
  console.log('❌ Team routes error:', e.message);
}

try {
  if (teamManagementRoutes && typeof teamManagementRoutes === 'function') {
    app.use('/api/team-management', teamManagementRoutes);
    console.log('✅ Team management routes loaded');
  } else {
    console.log('❌ Team management routes invalid:', typeof teamManagementRoutes);
  }
} catch (e) {
  console.log('❌ Team management routes error:', e.message);
}

try {
  if (leadershipRoutes && typeof leadershipRoutes === 'function') {
    app.use('/api/leadership', leadershipRoutes);
    console.log('✅ Leadership routes loaded');
  } else {
    console.log('❌ Leadership routes invalid:', typeof leadershipRoutes);
  }
} catch (e) {
  console.log('❌ Leadership routes error:', e.message);
}

try {
  if (aiRoutes && typeof aiRoutes === 'function') {
    app.use('/api/ai', aiRoutes);
    console.log('✅ AI routes loaded');
  } else {
    console.log('❌ AI routes invalid:', typeof aiRoutes);
  }
} catch (e) {
  console.log('❌ AI routes error:', e.message);
}

// Serve static files in production
if (config.nodeEnv === 'production') {
  app.use(express.static(path.join(__dirname, 'build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Error handling middleware (must be last)
if (errorHandler && typeof errorHandler === 'function') {
  app.use(errorHandler);
  console.log('✅ Error handler loaded');
} else {
  console.log('❌ Error handler invalid, using fallback');
  app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ success: false, error: 'Server Error' });
  });
}

// Database connection test
const testDatabaseConnection = async () => {
  try {
    const result = await query('SELECT NOW() as current_time');
    console.log('✅ Database connected successfully at:', result.rows[0].current_time);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  try {
    await testDatabaseConnection();
    
    const server = app.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📊 Environment: ${config.nodeEnv}`);
      console.log(`🌐 CORS origin: ${config.corsOrigin}`);
      console.log(`💾 Database: ${config.database.host}:${config.database.port}/${config.database.name}`);
      console.log(`📡 Health check: http://localhost:${config.port}/health`);
      console.log(`🔗 API base: http://localhost:${config.port}/api`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;