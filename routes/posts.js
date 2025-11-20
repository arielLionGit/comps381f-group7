const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const upload = require('../config/upload');
const path = require('path');

// 獲取有效的用戶 ID（如果是管理員，則查找或創建管理員用戶記錄）
const getValidUserId = async (sessionUserId) => {
  // 如果已經是有效的 ObjectId，直接返回
  if (mongoose.Types.ObjectId.isValid(sessionUserId) && sessionUserId !== 'admin') {
    return sessionUserId;
  }
  
  // 如果是管理員，查找或創建管理員用戶
  if (sessionUserId === 'admin') {
    let adminUser = await User.findOne({ username: 'admin' });
    if (!adminUser) {
      // 如果不存在，創建一個管理員用戶記錄
      adminUser = new User({
        username: 'admin',
        email: 'admin@example.com',
        password: '123456' // 這個密碼不會被使用，因為管理員通過特殊邏輯登入
      });
      await adminUser.save();
    }
    return adminUser._id;
  }
  
  return sessionUserId;
};

// 首頁 - 顯示所有文章
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const totalPosts = await Post.countDocuments();
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username');

    const totalPages = Math.ceil(totalPosts / limit);

    res.render('index', {
      posts,
      currentPage: page,
      totalPages,
      user: req.session ? req.session.username : null,
      isAdmin: req.session ? req.session.isAdmin : false
    });
  } catch (error) {
    console.error('獲取文章列表錯誤:', error);
    res.status(500).render('error', {
      message: '無法載入文章列表',
      error: error,
      user: req.session ? req.session.username : null,
      isAdmin: req.session ? req.session.isAdmin : false
    });
  }
});

// 顯示建立文章頁面
router.get('/create', requireAuth, (req, res) => {
  res.render('post-create', {
    errors: [],
    user: req.session.username,
    isAdmin: req.session.isAdmin
  });
});

// 處理建立文章
router.post('/create', requireAuth, upload.array('images', 5), [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('標題不能為空')
    .isLength({ max: 200 })
    .withMessage('標題不能超過 200 個字元'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('內容不能為空'),
  body('tags')
    .optional()
    .trim()
], async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.render('post-create', {
      errors: errors.array(),
      user: req.session.username,
      isAdmin: req.session.isAdmin
    });
  }

  const { title, content, tags } = req.body;

  try {
    // 處理圖片 - 轉換為 Base64
    const images = req.files ? req.files.map(file => {
      const base64Data = file.buffer.toString('base64');
      const dataUri = `data:${file.mimetype};base64,${base64Data}`;
      return {
        filename: file.originalname || `image_${Date.now()}_${Math.round(Math.random() * 1E9)}${path.extname(file.originalname || '')}`,
        mimetype: file.mimetype,
        data: dataUri
      };
    }) : [];

    // 處理標籤
    const tagArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    // 獲取有效的用戶 ID（處理管理員情況）
    const validUserId = await getValidUserId(req.session.userId);

    // 建立文章
    const post = new Post({
      title,
      content,
      author: validUserId,
      authorName: req.session.username,
      images,
      tags: tagArray
    });

    await post.save();

    res.redirect('/post/' + post._id);
  } catch (error) {
    console.error('建立文章錯誤:', error);
    
    res.render('post-create', {
      errors: [{ msg: '建立文章失敗，請稍後再試' }],
      user: req.session.username,
      isAdmin: req.session.isAdmin
    });
  }
});

// 顯示單篇文章
router.get('/post/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'username');
    
    if (!post) {
      return res.status(404).render('error', {
        message: '文章不存在',
        error: { status: 404 },
        user: req.session ? req.session.username : null,
        isAdmin: req.session ? req.session.isAdmin : false
      });
    }

    // 增加瀏覽次數
    await post.incrementViewCount();

    // 獲取留言
    const comments = await Comment.find({ post: post._id })
      .sort({ createdAt: -1 })
      .populate('author', 'username');

    res.render('post-detail', {
      post,
      comments,
      user: req.session ? req.session.username : null,
      userId: req.session ? req.session.userId : null,
      isAdmin: req.session ? req.session.isAdmin : false
    });
  } catch (error) {
    console.error('獲取文章錯誤:', error);
    res.status(500).render('error', {
      message: '無法載入文章',
      error: error,
      user: req.session ? req.session.username : null,
      isAdmin: req.session ? req.session.isAdmin : false
    });
  }
});

// 顯示編輯文章頁面
router.get('/post/:id/edit', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).render('error', {
        message: '文章不存在',
        error: { status: 404 },
        user: req.session.username,
        isAdmin: req.session.isAdmin
      });
    }

    // 獲取有效的用戶 ID（處理管理員情況）
    const validUserId = await getValidUserId(req.session.userId);
    
    // 檢查是否為作者或管理員
    if (post.author.toString() !== validUserId.toString() && !req.session.isAdmin) {
      return res.status(403).render('error', {
        message: '無權限編輯此文章',
        error: { status: 403 },
        user: req.session.username,
        isAdmin: req.session.isAdmin
      });
    }

    res.render('post-edit', {
      post,
      errors: [],
      user: req.session.username,
      isAdmin: req.session.isAdmin
    });
  } catch (error) {
    console.error('載入編輯頁面錯誤:', error);
    res.status(500).render('error', {
      message: '無法載入編輯頁面',
      error: error,
      user: req.session.username,
      isAdmin: req.session.isAdmin
    });
  }
});

// 處理編輯文章
router.post('/post/:id/edit', requireAuth, upload.array('images', 5), [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('標題不能為空')
    .isLength({ max: 200 })
    .withMessage('標題不能超過 200 個字元'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('內容不能為空'),
  body('tags')
    .optional()
    .trim()
], async (req, res) => {
  const errors = validationResult(req);
  
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).render('error', {
        message: '文章不存在',
        error: { status: 404 },
        user: req.session.username,
        isAdmin: req.session.isAdmin
      });
    }

    // 獲取有效的用戶 ID（處理管理員情況）
    const validUserId = await getValidUserId(req.session.userId);
    
    // 檢查是否為作者或管理員
    if (post.author.toString() !== validUserId.toString() && !req.session.isAdmin) {
      return res.status(403).render('error', {
        message: '無權限編輯此文章',
        error: { status: 403 },
        user: req.session.username,
        isAdmin: req.session.isAdmin
      });
    }

    if (!errors.isEmpty()) {
      return res.render('post-edit', {
        post,
        errors: errors.array(),
        user: req.session.username,
        isAdmin: req.session.isAdmin
      });
    }

    const { title, content, tags, removeImages } = req.body;

    // 處理要刪除的圖片（根據索引或 filename）
    if (removeImages) {
      const imagesToRemove = Array.isArray(removeImages) ? removeImages : [removeImages];
      // 如果 removeImages 是索引陣列，過濾掉對應的圖片
      post.images = post.images.filter((img, index) => !imagesToRemove.includes(index.toString()));
    }

    // 處理新上傳的圖片 - 轉換為 Base64
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => {
        const base64Data = file.buffer.toString('base64');
        const dataUri = `data:${file.mimetype};base64,${base64Data}`;
        return {
          filename: file.originalname || `image_${Date.now()}_${Math.round(Math.random() * 1E9)}${path.extname(file.originalname || '')}`,
          mimetype: file.mimetype,
          data: dataUri
        };
      });
      post.images.push(...newImages);
    }

    // 處理標籤
    const tagArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    // 更新文章
    post.title = title;
    post.content = content;
    post.tags = tagArray;
    post.updatedAt = Date.now();

    await post.save();

    res.redirect('/post/' + post._id);
  } catch (error) {
    console.error('更新文章錯誤:', error);
    
    const post = await Post.findById(req.params.id);
    res.render('post-edit', {
      post,
      errors: [{ msg: '更新文章失敗，請稍後再試' }],
      user: req.session.username,
      isAdmin: req.session.isAdmin
    });
  }
});

// 刪除文章
router.post('/post/:id/delete', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ success: false, message: '文章不存在' });
    }

    // 獲取有效的用戶 ID（處理管理員情況）
    const validUserId = await getValidUserId(req.session.userId);
    
    // 檢查是否為作者或管理員
    if (post.author.toString() !== validUserId.toString() && !req.session.isAdmin) {
      return res.status(403).json({ success: false, message: '無權限刪除此文章' });
    }

    // 刪除文章的留言
    await Comment.deleteMany({ post: post._id });

    // 刪除文章
    await Post.findByIdAndDelete(req.params.id);

    res.redirect('/');
  } catch (error) {
    console.error('刪除文章錯誤:', error);
    res.status(500).json({ success: false, message: '刪除文章失敗' });
  }
});

module.exports = router;
