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
    .withMessage('用戶名必須在 3-50 個字元之間')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用戶名只能包含字母、數字和底線'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('請輸入有效的電子郵件地址')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密碼至少需要 6 個字元'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('密碼確認不符')
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
    // 檢查用戶名是否已存在
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email }] 
    });

    if (existingUser) {
      return res.render('register', {
        errors: [{ msg: '用戶名或電子郵件已被使用' }],
        user: null,
        isAdmin: false
      });
    }

    // 建立新用戶
    const user = new User({
      username,
      email,
      password
    });

    await user.save();

    // 自動登入
    req.session.userId = user._id;
    req.session.username = user.username;
    req.session.isAdmin = false;

    res.redirect('/');
  } catch (error) {
    console.error('註冊錯誤:', error);
    res.render('register', {
      errors: [{ msg: '註冊失敗，請稍後再試' }],
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
  body('username').trim().notEmpty().withMessage('請輸入用戶名'),
  body('password').notEmpty().withMessage('請輸入密碼')
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
    // 檢查是否為管理員登入
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      req.session.userId = 'admin';
      req.session.username = 'Admin';
      req.session.isAdmin = true;
      return res.redirect('/admin/dashboard');
    }

    // 一般用戶登入
    const user = await User.findOne({ username });

    if (!user) {
      return res.render('login', {
        errors: [{ msg: '用戶名或密碼錯誤' }],
        user: null,
        isAdmin: false
      });
    }

    // 檢查用戶是否被禁止
    if (user.isBanned) {
      return res.render('login', {
        errors: [{ msg: '您的帳號已被禁止使用，請聯絡管理員' }],
        user: null,
        isAdmin: false
      });
    }

    // 驗證密碼
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.render('login', {
        errors: [{ msg: '用戶名或密碼錯誤' }],
        user: null,
        isAdmin: false
      });
    }

    // 更新登入資訊
    await user.updateLoginInfo();

    // 設定 session
    req.session.userId = user._id;
    req.session.username = user.username;
    req.session.isAdmin = false;

    res.redirect('/');
  } catch (error) {
    console.error('登入錯誤:', error);
    res.render('login', {
      errors: [{ msg: '登入失敗，請稍後再試' }],
      user: null,
      isAdmin: false
    });
  }
});

// 登出
router.get('/logout', (req, res) => {
  req.session = null;
  res.redirect('/login');
});

module.exports = router;
