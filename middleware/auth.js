const mongoose = require('mongoose');

// 檢查用戶是否已登入
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.redirect('/login');
  }
  next();
};

// 檢查用戶是否為訪客（未登入）
const requireGuest = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.redirect('/');
  }
  next();
};

// 檢查用戶是否為管理員
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

// 檢查用戶是否被禁止
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
      console.error('檢查禁止狀態錯誤:', error);
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
