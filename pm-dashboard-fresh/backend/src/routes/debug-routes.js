console.log('🔍 BACKEND ROUTE DEBUGGER');
console.log('🔍 =====================');

console.log('📁 Current working directory:', process.cwd());
console.log('📁 __dirname:', __dirname);

console.log('\n🔍 TEST 1: Checking if route files exist...');

const fs = require('fs');
const path = require('path');

const routeFiles = [
  './routes/auth.js',
  './routes/projects.js', 
  './routes/users.js',
  './routes/index.js'
];

routeFiles.forEach(file => {
  try {
    const fullPath = path.resolve(file);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ ${file} exists at ${fullPath}`);
    } else {
      console.log(`❌ ${file} NOT FOUND`);
    }
  } catch (error) {
    console.log(`❌ Error checking ${file}:`, error.message);
  }
});

console.log('\n🔍 TEST 2: Trying to require route files...');

routeFiles.forEach(file => {
  try {
    console.log(`🔄 Requiring ${file}...`);
    const routeModule = require(file);
    console.log(`✅ ${file} loaded successfully, type:`, typeof routeModule);
    
    if (routeModule && typeof routeModule === 'function') {
      console.log(`✅ ${file} appears to be a valid Express router`);
    } else {
      console.log(`⚠️ ${file} loaded but might not be a valid router:`, routeModule);
    }
  } catch (error) {
    console.log(`❌ Failed to require ${file}:`, error.message);
    console.log(`❌ Error stack:`, error.stack);
  }
});

console.log('\n🔍 TEST 3: Checking controller files...');

const controllerFiles = [
  './controllers/authController.js',
  './controllers/projectController.js',
  './controllers/userController.js'
];

controllerFiles.forEach(file => {
  try {
    const fullPath = path.resolve(file);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ ${file} exists`);
      const controller = require(file);
      console.log(`✅ ${file} exports:`, Object.keys(controller));
    } else {
      console.log(`❌ ${file} NOT FOUND`);
    }
  } catch (error) {
    console.log(`❌ Error with ${file}:`, error.message);
  }
});

console.log('\n🔍 TEST 4: Checking middleware files...');

const middlewareFiles = [
  './middleware/errorHandler.js',
  './config/database.js'
];

middlewareFiles.forEach(file => {
  try {
    const fullPath = path.resolve(file);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ ${file} exists`);
      
      const middleware = require(file);
      console.log(`✅ ${file} exports:`, Object.keys(middleware));
    } else {
      console.log(`❌ ${file} NOT FOUND`);
    }
  } catch (error) {
    console.log(`❌ Error with ${file}:`, error.message);
  }
});

console.log('\n🔍 TEST 5: Creating minimal test server...');

try {
  const express = require('express');
  const app = express();
  
  app.use(express.json());
  
  app.post('/api/auth/test', (req, res) => {
    res.json({ success: true, message: 'Test auth route works!' });
  });
  
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });
  
  const server = app.listen(5002, () => {
    console.log('✅ Test server started on port 5002');
    console.log('✅ You can test with: curl http://localhost:5002/api/health');
    
    setTimeout(() => {
      server.close(() => {
        console.log('✅ Test server closed');
        console.log('\n🔍 DIAGNOSIS COMPLETE');
        console.log('📋 Summary:');
        console.log('   - Check the ❌ errors above');
        console.log('   - Missing files need to be created');  
        console.log('   - Broken requires need to be fixed');
        console.log('   - Then restart your main server');
      });
    }, 2000);
  });
  
} catch (error) {
  console.log('❌ Failed to create test server:', error.message);
}