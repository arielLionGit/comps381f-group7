const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { requireGuest } = require('../middleware/auth');


const ADMIN_CONFIG = {
  username: 'admin',
  password: '123456'
};

const ADMIN_USERNAME = ADMIN_CONFIG.username || process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = ADMIN_CONFIG.password || process.env.ADMIN_PASSWORD || '123456';

// 顯示註冊頁面
router.get('/register', requireGuest, (req, res) => {
  res.render('register', {
    errors: [],
    user: null,
    isAdmin: false
  });
});

// 處理註冊
router.post('/register', [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be 3-50 characters long')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only include letters, numbers, and underscores'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match')
], async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.render('register', {
      errors: errors.array(),
      user: null,
      isAdmin: false
    });
  }

  const { username, email, password } = req.body;

  try {
    // Check if username/email already used
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email }] 
    });

    if (existingUser) {
      return res.render('register', {
        errors: [{ msg: 'Username or email is already taken' }],
        user: null,
        isAdmin: false
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password
    });

    await user.save();

    // Auto login
    req.session.userId = user._id;
    req.session.username = user.username;
    req.session.isAdmin = false;

    res.redirect('/');
  } catch (error) {
    console.error('Registration error:', error);
    res.render('register', {
      errors: [{ msg: 'Registration failed, please try again later' }],
      user: null,
      isAdmin: false
    });
  }
});

// 顯示登入頁面
router.get('/login', requireGuest, (req, res) => {
  res.render('login', {
    errors: [],
    user: null,
    isAdmin: false
  });
});

// 處理登入
router.post('/login', [
  body('username').trim().notEmpty().withMessage('Please enter your username'),
  body('password').notEmpty().withMessage('Please enter your password')
], async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.render('login', {
      errors: errors.array(),
      user: null,
      isAdmin: false
    });
  }

  const { username, password } = req.body;

  try {
    // Admin login
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      req.session.userId = 'admin';
      req.session.username = 'Admin';
      req.session.isAdmin = true;
      return res.redirect('/admin/dashboard');
    }

    // Regular user login
    const user = await User.findOne({ username });

    if (!user) {
      return res.render('login', {
        errors: [{ msg: 'Incorrect username or password' }],
        user: null,
        isAdmin: false
      });
    }

    // Check banned status
    if (user.isBanned) {
      return res.render('login', {
        errors: [{ msg: 'Your account has been banned. Please contact the admin.' }],
        user: null,
        isAdmin: false
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.render('login', {
        errors: [{ msg: 'Incorrect username or password' }],
        user: null,
        isAdmin: false
      });
    }

    // Update login info
    await user.updateLoginInfo();

    // Set session
    req.session.userId = user._id;
    req.session.username = user.username;
    req.session.isAdmin = false;

    res.redirect('/');
  } catch (error) {
    console.error('Login error:', error);
    res.render('login', {
      errors: [{ msg: 'Login failed, please try again later' }],
      user: null,
      isAdmin: false
    });
  }
});

// logout
router.get('/logout', (req, res) => {
  req.session = null;
  res.redirect('/login');
});

module.exports = router;
