const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');

// API auth middleware
const apiAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized. Please log in first.' 
    });
  }
  next();
};



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
    console.error('API fetch posts error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch posts' 
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
        message: 'Post not found' 
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
    console.error('API fetch post error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch post' 
    });
  }
});

// POST /api/posts - 建立文章
router.post('/posts', apiAuth, [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
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
    const post = new Post({
      title,
      content,
      author: req.session.userId,
      authorName: req.session.username,
      tags: tags || []
    });

    await post.save();
    await post.populate('author', 'username email');

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: { post }
    });
  } catch (error) {
    console.error('API create post error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create post' 
    });
  }
});

// PUT /api/posts/:id - 更新文章
router.put('/posts/:id', apiAuth, [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('content')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Content is required'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
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
        message: 'Post not found' 
      });
    }

    // 檢查是否為作者或管理員
    if (post.author.toString() !== req.session.userId && !req.session.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to edit this post' 
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
      message: 'Post updated successfully',
      data: { post }
    });
  } catch (error) {
    console.error('API update post error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update post' 
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
        message: 'Post not found' 
      });
    }

    // 檢查是否為作者或管理員
    if (post.author.toString() !== req.session.userId && !req.session.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to delete this post' 
      });
    }

    // 刪除文章的留言
    await Comment.deleteMany({ post: post._id });

    // 刪除文章
    await Post.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('API delete post error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete post' 
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
    console.error('API fetch comments error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch comments' 
    });
  }
});

// POST /api/posts/:postId/comments - 建立留言
router.post('/posts/:postId/comments', apiAuth, [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Comment content is required')
    .isLength({ max: 1000 })
    .withMessage('Comment cannot exceed 1000 characters')
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
        message: 'Post not found' 
      });
    }

    const comment = new Comment({
      content,
      author: req.session.userId,
      authorName: req.session.username,
      post: postId
    });

    await comment.save();
    await comment.populate('author', 'username');

    res.status(201).json({
      success: true,
      message: 'Comment created successfully',
      data: { comment }
    });
  } catch (error) {
    console.error('API create comment error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create comment' 
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
        message: 'Comment not found' 
      });
    }

    // 檢查是否為留言作者或管理員
    if (comment.author.toString() !== req.session.userId && !req.session.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to delete this comment' 
      });
    }

    await Comment.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('API delete comment error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete comment' 
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
      message: 'Access denied' 
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
    console.error('API fetch users error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch users' 
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
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('API fetch user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch user info' 
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
    console.error('API search error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Search failed' 
    });
  }
});

module.exports = router;
