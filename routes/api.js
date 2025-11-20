const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');

// API 認證中間件
const apiAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ 
      success: false, 
      message: '未授權，請先登入' 
    });
  }
  next();
};

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
        password: 'dummy' // 這個密碼不會被使用，因為管理員通過特殊邏輯登入
      });
      await adminUser.save();
    }
    return adminUser._id;
  }
  
  return sessionUserId;
};

// ========================================
// 文章 API
// ========================================

// GET /api/posts - 獲取所有文章
router.get('/posts', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalPosts = await Post.countDocuments();
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username email')
      .lean();

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalPosts / limit),
          totalPosts,
          limit
        }
      }
    });
  } catch (error) {
    console.error('API 獲取文章列表錯誤:', error);
    res.status(500).json({ 
      success: false, 
      message: '獲取文章列表失敗' 
    });
  }
});

// GET /api/posts/:id - 獲取單篇文章
router.get('/posts/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username email')
      .lean();
    
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: '文章不存在' 
      });
    }

    // 獲取文章的留言
    const comments = await Comment.find({ post: post._id })
      .sort({ createdAt: -1 })
      .populate('author', 'username')
      .lean();

    res.json({
      success: true,
      data: {
        post,
        comments
      }
    });
  } catch (error) {
    console.error('API 獲取文章錯誤:', error);
    res.status(500).json({ 
      success: false, 
      message: '獲取文章失敗' 
    });
  }
});

// POST /api/posts - 建立文章
router.post('/posts', apiAuth, [
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
    .isArray()
    .withMessage('標籤必須是陣列')
], async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }

  const { title, content, tags } = req.body;

  try {
    // 獲取有效的用戶 ID（處理管理員情況）
    const validUserId = await getValidUserId(req.session.userId);
    
    const post = new Post({
      title,
      content,
      author: validUserId,
      authorName: req.session.username,
      tags: tags || []
    });

    await post.save();
    await post.populate('author', 'username email');

    res.status(201).json({
      success: true,
      message: '文章建立成功',
      data: { post }
    });
  } catch (error) {
    console.error('API 建立文章錯誤:', error);
    res.status(500).json({ 
      success: false, 
      message: '建立文章失敗' 
    });
  }
});

// PUT /api/posts/:id - 更新文章
router.put('/posts/:id', apiAuth, [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('標題不能為空')
    .isLength({ max: 200 })
    .withMessage('標題不能超過 200 個字元'),
  body('content')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('內容不能為空'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('標籤必須是陣列')
], async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }

  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: '文章不存在' 
      });
    }

    // 獲取有效的用戶 ID（處理管理員情況）
    const validUserId = await getValidUserId(req.session.userId);
    
    // 檢查是否為作者或管理員
    if (post.author.toString() !== validUserId.toString() && !req.session.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: '無權限編輯此文章' 
      });
    }

    const { title, content, tags } = req.body;

    if (title) post.title = title;
    if (content) post.content = content;
    if (tags) post.tags = tags;
    post.updatedAt = Date.now();

    await post.save();
    await post.populate('author', 'username email');

    res.json({
      success: true,
      message: '文章更新成功',
      data: { post }
    });
  } catch (error) {
    console.error('API 更新文章錯誤:', error);
    res.status(500).json({ 
      success: false, 
      message: '更新文章失敗' 
    });
  }
});

// DELETE /api/posts/:id - 刪除文章
router.delete('/posts/:id', apiAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: '文章不存在' 
      });
    }

    // 獲取有效的用戶 ID（處理管理員情況）
    const validUserId = await getValidUserId(req.session.userId);
    
    // 檢查是否為作者或管理員
    if (post.author.toString() !== validUserId.toString() && !req.session.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: '無權限刪除此文章' 
      });
    }

    // 刪除文章的留言
    await Comment.deleteMany({ post: post._id });

    // 刪除文章
    await Post.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: '文章刪除成功'
    });
  } catch (error) {
    console.error('API 刪除文章錯誤:', error);
    res.status(500).json({ 
      success: false, 
      message: '刪除文章失敗' 
    });
  }
});

// ========================================
// 留言 API
// ========================================

// GET /api/posts/:postId/comments - 獲取文章的所有留言
router.get('/posts/:postId/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .sort({ createdAt: -1 })
      .populate('author', 'username')
      .lean();

    res.json({
      success: true,
      data: { comments }
    });
  } catch (error) {
    console.error('API 獲取留言列表錯誤:', error);
    res.status(500).json({ 
      success: false, 
      message: '獲取留言列表失敗' 
    });
  }
});

// POST /api/posts/:postId/comments - 建立留言
router.post('/posts/:postId/comments', apiAuth, [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('留言內容不能為空')
    .isLength({ max: 1000 })
    .withMessage('留言內容不能超過 1000 個字元')
], async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }

  const { content } = req.body;
  const { postId } = req.params;

  try {
    // 檢查文章是否存在
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: '文章不存在' 
      });
    }

    // 獲取有效的用戶 ID（處理管理員情況）
    const validUserId = await getValidUserId(req.session.userId);
    
    const comment = new Comment({
      content,
      author: validUserId,
      authorName: req.session.username,
      post: postId
    });

    await comment.save();
    await comment.populate('author', 'username');

    res.status(201).json({
      success: true,
      message: '留言建立成功',
      data: { comment }
    });
  } catch (error) {
    console.error('API 建立留言錯誤:', error);
    res.status(500).json({ 
      success: false, 
      message: '建立留言失敗' 
    });
  }
});

// DELETE /api/comments/:id - 刪除留言
router.delete('/comments/:id', apiAuth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ 
        success: false, 
        message: '留言不存在' 
      });
    }

    // 獲取有效的用戶 ID（處理管理員情況）
    const validUserId = await getValidUserId(req.session.userId);
    
    // 檢查是否為留言作者或管理員
    if (comment.author.toString() !== validUserId.toString() && !req.session.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: '無權限刪除此留言' 
      });
    }

    await Comment.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: '留言刪除成功'
    });
  } catch (error) {
    console.error('API 刪除留言錯誤:', error);
    res.status(500).json({ 
      success: false, 
      message: '刪除留言失敗' 
    });
  }
});

// ========================================
// 用戶 API
// ========================================

// GET /api/users - 獲取所有用戶（僅管理員）
router.get('/users', apiAuth, async (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(403).json({ 
      success: false, 
      message: '無權限訪問' 
    });
  }

  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: { users }
    });
  } catch (error) {
    console.error('API 獲取用戶列表錯誤:', error);
    res.status(500).json({ 
      success: false, 
      message: '獲取用戶列表失敗' 
    });
  }
});

// GET /api/users/:id - 獲取單個用戶資訊
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .lean();
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: '用戶不存在' 
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('API 獲取用戶錯誤:', error);
    res.status(500).json({ 
      success: false, 
      message: '獲取用戶資訊失敗' 
    });
  }
});

// ========================================
// 搜尋 API
// ========================================

// GET /api/search - 搜尋文章
router.get('/search', async (req, res) => {
  try {
    const { q: query, tags, startDate, endDate } = req.query;

    const searchConditions = [];

    if (query) {
      const regex = new RegExp(query, 'i');
      searchConditions.push({
        $or: [
          { title: regex },
          { content: regex }
        ]
      });
    }

    if (startDate || endDate) {
      const dateCondition = {};
      if (startDate) dateCondition.$gte = new Date(startDate);
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        dateCondition.$lte = endDateTime;
      }
      if (Object.keys(dateCondition).length > 0) {
        searchConditions.push({ createdAt: dateCondition });
      }
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim().toLowerCase());
      searchConditions.push({ tags: { $in: tagArray } });
    }

    const searchFilter = searchConditions.length > 0 
      ? { $and: searchConditions } 
      : {};

    const posts = await Post.find(searchFilter)
      .sort({ createdAt: -1 })
      .populate('author', 'username')
      .limit(50)
      .lean();

    res.json({
      success: true,
      data: { posts }
    });
  } catch (error) {
    console.error('API 搜尋錯誤:', error);
    res.status(500).json({ 
      success: false, 
      message: '搜尋失敗' 
    });
  }
});

module.exports = router;
