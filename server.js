require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const methodOverride = require('method-override');
const path = require('path');
const mongoose = require('mongoose');
const User = require('./models/User');

const SERVER_CONFIG = {
  PORT: 3000,  // Server port
  SESSION_SECRET: 'your-secret-key-change-in-production'  // Session secret key
};

const PORT = SERVER_CONFIG.PORT || process.env.PORT || 3000;
const SESSION_SECRET = SERVER_CONFIG.SESSION_SECRET || process.env.SESSION_SECRET || 'your-secret-key';

// Database connection configuration
const DB_CONFIG = {
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
};

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Group7:123@cluster0.lctwnkf.mongodb.net/?appName=Cluster0';

// Database connection function
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, DB_CONFIG.options);
    console.log('✓ MongoDB connection successful');
    console.log(`✓ Database address: ${MONGODB_URI}`);
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);
    console.error('Please check the following:');
    console.error('1. Is MongoDB service running?');
    console.error('2. Is the connection string correct?');
    console.error('3. Is the network connection normal?');
    process.exit(1);
  }
};

// Listen to database events
mongoose.connection.on('disconnected', () => {
  console.log('⚠ MongoDB connection disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('✗ MongoDB error:', err);
});

// Initialize Express app
const app = express();

// Connect to database
connectDB();

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Method override (support PUT and DELETE)
app.use(methodOverride('_method'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(cookieSession({
  name: 'session',
  keys: [SESSION_SECRET],
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

// Global variables middleware
app.use((req, res, next) => {
  res.locals.user = req.session ? req.session.username : null;
  res.locals.userId = req.session ? req.session.userId : null;
  res.locals.isAdmin = req.session ? req.session.isAdmin : false;
  next();
});

// Check user banned status middleware
const checkBanned = async (req, res, next) => {
  if (req.session && req.session.userId) {
    const sessionUserId = req.session.userId;

    // Skip banned check for admin session or invalid ObjectId strings
    if (!mongoose.Types.ObjectId.isValid(sessionUserId)) {
      return next();
    }

    try {
      const user = await User.findById(sessionUserId);
      if (user && user.isBanned) {
        req.session = null; // clear session
        return res.render('error', {
          message: 'Account banned',
          error: { status: 403, stack: 'Your account has been banned. Please contact the administrator.' },
          user: null,
          isAdmin: false
        });
      }
    } catch (error) {
      console.error('Check banned status error:', error);
    }
  }
  next();
};
app.use(checkBanned);

// Authentication routes
const authRoutes = require('./models/auth');
app.use('/', authRoutes);

// Post routes
const postRoutes = require('./models/postRoutes');
app.use('/', postRoutes);

// Comment routes
const commentRoutes = require('./models/commentRoutes');
app.use('/', commentRoutes);

// Search routes
const searchRoutes = require('./models/search');
app.use('/', searchRoutes);

// Admin routes
const adminRoutes = require('./models/admin');
app.use('/admin', adminRoutes);

// API routes
const apiRoutes = require('./models/api');
app.use('/api', apiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    message: 'Page not found',
    error: { status: 404, stack: 'The page you are looking for does not exist.' },
    user: req.session ? req.session.username : null,
    isAdmin: req.session ? req.session.isAdmin : false
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);

  const isJsonSyntaxError = err instanceof SyntaxError && err.type === 'entity.parse.failed';
  if (isJsonSyntaxError) {
    const message = 'Invalid JSON payload. Use valid JSON syntax (double quotes) and UTF-8 encoding.';

    if (req.originalUrl.startsWith('/api/')) {
      return res.status(400).json({
        success: false,
        message
      });
    }

    return res.status(400).render('error', {
      message,
      error: { status: 400, stack: err.message },
      user: req.session ? req.session.username : null,
      isAdmin: req.session ? req.session.isAdmin : false
    });
  }

  res.status(err.status || 500).render('error', {
    message: err.message || 'Server error',
    error: process.env.NODE_ENV === 'development' ? err : {},
    user: req.session ? req.session.username : null,
    isAdmin: req.session ? req.session.isAdmin : false
  });
});


app.listen(PORT, () => {
  console.log('========================================');
  console.log('🚀 Blog Platform server started');
  console.log('========================================');
  console.log(`✓ Listening on: http://localhost:${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('========================================');
  console.log('Admin credentials:');
  console.log('  Username: admin');
  console.log('  Password: 123456');
  console.log('========================================');
});

module.exports = app;
