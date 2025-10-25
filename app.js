const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom middleware
const logger = require('./middleware/loggerMiddleware');
app.use(logger);

// MongoDB Connection with improved error handling and timeout settings
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000, // 30 seconds
  socketTimeoutMS: 45000, // 45 seconds
})
.then(() => {
  console.log('✓ Connected to MongoDB successfully');
  console.log('✓ Database:', mongoose.connection.name);
  
  // Start cache update service after DB connection
  try {
    const cacheUpdateService = require('./services/cacheUpdateService');
    cacheUpdateService.start();
  } catch (error) {
    console.error('⚠️  Cache update service failed to start:', error.message);
  }
})
.catch(err => {
  console.error('✗ MongoDB connection error:', err.message);
  console.error('Connection string (masked):', process.env.MONGODB_URI?.replace(/:[^:@]+@/, ':****@'));
  console.error('\nTroubleshooting tips:');
  console.error('1. Check if MongoDB URI in .env is correct');
  console.error('2. Verify Network Access in MongoDB Atlas (allow 0.0.0.0/0)');
  console.error('3. Check if database user exists with correct password');
  console.error('4. Make sure password special characters are URL encoded');
  process.exit(1);
});

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('📡 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('📴 Mongoose disconnected from MongoDB');
});

// Routes
const usersRoute = require('./routes/usersRoute');
const newsRoute = require('./routes/newsRoute');

app.use('/api/users', usersRoute);
app.use('/api/news', newsRoute);

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to News Aggregator API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      users: {
        register: 'POST /api/users/register',
        login: 'POST /api/users/login',
        updatePreferences: 'PUT /api/users/preferences'
      },
      news: {
        getNews: 'GET /api/news',
        search: 'GET /api/news/search/:keyword',
        markRead: 'POST /api/news/:id/read',
        markFavorite: 'POST /api/news/:id/favorite',
        getRead: 'GET /api/news/read',
        getFavorites: 'GET /api/news/favorites',
        removeFavorite: 'DELETE /api/news/:id/favorite'
      }
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  const healthCheck = {
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development'
  };
  
  res.status(200).json(healthCheck);
});

// 404 handler - must be after all routes
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    message: `Route not found: ${req.method} ${req.url}`,
    availableEndpoints: {
      root: '/',
      health: '/health',
      users: '/api/users/*',
      news: '/api/news/*'
    }
  });
});

// Global error handler - must be last
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  console.error('Stack trace:', err.stack);
  
  // Don't expose error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
  
  res.status(err.status || 500).json({ 
    success: false,
    message: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✓ Local URL: http://localhost:${PORT}`);
  console.log(`✓ Health check: http://localhost:${PORT}/health`);
  console.log('='.repeat(50) + '\n');
});

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} signal received: closing HTTP server`);
  
  // Stop cache update service
  try {
    const cacheUpdateService = require('./services/cacheUpdateService');
    cacheUpdateService.stop();
  } catch (error) {
    console.error('Error stopping cache service:', error.message);
  }
  
  server.close(() => {
    console.log('✓ HTTP server closed');
    
    mongoose.connection.close(false, () => {
      console.log('✓ MongoDB connection closed');
      process.exit(0);
    });
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('❌ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  console.error('Stack trace:', err.stack);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
});

module.exports = app;