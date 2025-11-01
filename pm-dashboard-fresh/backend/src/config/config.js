require('dotenv').config();

const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'project_manager',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20, // maximum number of clients in the pool
    idleTimeoutMillis: 30000, // how long a client is allowed to remain idle
    connectionTimeoutMillis: 2000, // how long to wait when connecting a new client
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  pagination: {
    defaultLimit: 10,
    maxLimit: 100,
  },
  
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  },
  
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100, 
  },
  
  validation: {
    project: {
      nameMinLength: 1,
      nameMaxLength: 255,
      descriptionMaxLength: 5000,
    },
    user: {
      nameMinLength: 2,
      nameMaxLength: 100,
      emailMaxLength: 255,
    },
    comment: {
      contentMinLength: 1,
      contentMaxLength: 2000,
    },
  },
};

if (config.nodeEnv === 'production') {
  const requiredEnvVars = [
    'DB_HOST',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_SECRET',
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars);
    process.exit(1);
  }
}

module.exports = config;