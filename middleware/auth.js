const mongoose = require('mongoose');

// Check if user is logged in
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.redirect('/login');
  }
  next();
};

// Check if user is a guest (not logged in)
const requireGuest = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.redirect('/');
  }
  next();
};

// Check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.session || !req.session.isAdmin) {
    return res.status(403).render('error', {
      message: 'Access denied',
      error: { status: 403, stack: 'You do not have permission to access this page.' },
      user: req.session ? req.session.username : null,
      isAdmin: false
    });
  }
  next();
};

// Check if user is banned
const checkBanned = async (req, res, next) => {
  if (req.session && req.session.userId) {
    const sessionUserId = req.session.userId;

    // Skip banned check for admin session or invalid ObjectId strings
    if (!mongoose.Types.ObjectId.isValid(sessionUserId)) {
      return next();
    }

    const User = require('../models/User');
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

module.exports = {
  requireAuth,
  requireGuest,
  requireAdmin,
  checkBanned
};
