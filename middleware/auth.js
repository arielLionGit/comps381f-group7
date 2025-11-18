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
      message: '拒絕存取',
      error: { status: 403, stack: '您沒有權限訪問此頁面' },
      user: req.session ? req.session.username : null,
      isAdmin: false
    });
  }
  next();
};

// 檢查用戶是否被禁止
const checkBanned = async (req, res, next) => {
  if (req.session && req.session.userId) {
    const User = require('../models/User');
    try {
      const user = await User.findById(req.session.userId);
      if (user && user.isBanned) {
        req.session = null; // 清除 session
        return res.render('error', {
          message: '帳號已被禁止',
          error: { status: 403, stack: '您的帳號已被管理員禁止使用，請聯絡管理員' },
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
