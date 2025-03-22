const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const leadRoutes = require('./routes/leads');
const campaignRoutes = require('./routes/campaigns');
const outreachRoutes = require('./routes/outreach');
const userRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');
const instantlyRoutes = require('./routes/instantly');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Skip auth for testing - NOT for production!
app.use((req, res, next) => {
  // Bypass authentication for testing
  req.user = { 
    _id: 'test-user-id',
    email: process.env.TEST_USER_EMAIL || 'admin@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'admin',
    integrations: {}
  };
  next();
});

// API routes
app.use('/api/leads', leadRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/outreach', outreachRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/instantly', instantlyRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'not connected'
  });
});

// API documentation route
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to the Sales Pipeline API',
    documentation: 'See README.md for API documentation',
    testing: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'not connected',
      instantly: '/api/outreach/test/instantly',
      salesfinity: '/api/outreach/test/salesfinity',
      linkedin: '/api/outreach/test/linkedin',
    }
  });
});

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  const error = new Error(`Route ${req.originalUrl} not found`);
  error.statusCode = 404;
  next(error);
});

// Global error handler
app.use((error, req, res, next) => {
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

// Start server function
const startServer = () => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    startServer();
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    console.log('Starting server without MongoDB for API testing...');
    startServer();
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
}); 