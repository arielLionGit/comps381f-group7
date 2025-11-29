const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Post = require('./Post');
const Comment = require('./Comment');
const User = require('./User');

// API authentication middleware
const apiAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized, please login first' 
    });
  }
  next();
};

// Get valid user ID (if admin, find or create admin user record)
const getValidUserId = async (sessionUserId) => {
  // If already a valid ObjectId, return directly
  if (mongoose.Types.ObjectId.isValid(sessionUserId) && sessionUserId !== 'admin') {
    return sessionUserId;
  }
  
  // If admin, find or create admin user
  if (sessionUserId === 'admin') {
    let adminUser = await User.findOne({ username: 'admin' });
    if (!adminUser) {
      // If not exists, create an admin user record
      adminUser = new User({
        username: 'admin',
        email: 'admin@example.com',
        password: '123456' 
      });
      await adminUser.save();
    }
    return adminUser._id;
  }
  
  return sessionUserId;
};

// Authentication API

// POST /api/logout - Logout and clear session (no authentication required)
router.post('/logout', (req, res) => {
  try {
    // Clear session if exists
    if (req.session) {
      req.session = null;
    }
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('API logout error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to logout' 
    });
  }
});

// Post API

// GET /api/posts - Get all posts
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
    console.error('API fetch post list error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch post list' 
    });
  }
});

// GET /api/posts/:id - Get single post
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

    // Get post comments
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

// POST /api/posts - Create post (no authentication required)
router.post('/posts', [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content cannot be empty'),
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
    // Handle user ID - use session if available, otherwise use anonymous user
    let validUserId;
    let authorName = 'Anonymous';
    
    if (req.session && req.session.userId) {
      validUserId = await getValidUserId(req.session.userId);
      authorName = req.session.username || 'Anonymous';
    } else {
      // Find or create anonymous user for API posts
      let anonymousUser = await User.findOne({ username: 'anonymous' });
      if (!anonymousUser) {
        anonymousUser = new User({
          username: 'anonymous',
          email: 'anonymous@example.com',
          password: 'anonymous'
        });
        await anonymousUser.save();
      }
      validUserId = anonymousUser._id;
    }
    
    const post = new Post({
      title,
      content,
      author: validUserId,
      authorName: authorName,
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

// PUT /api/posts/:id - Update post (no authentication required)
router.put('/posts/:id', [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('content')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Content cannot be empty'),
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

    // If user is logged in, check permissions; otherwise allow update
    if (req.session && req.session.userId) {
      const validUserId = await getValidUserId(req.session.userId);
      
      // Check if user is author or admin
      if (post.author.toString() !== validUserId.toString() && !req.session.isAdmin) {
        return res.status(403).json({ 
          success: false, 
          message: 'No permission to edit this post' 
        });
      }
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

// DELETE /api/posts/:id - Delete post (no authentication required)
router.delete('/posts/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: 'Post not found' 
      });
    }

    // If user is logged in, check permissions; otherwise allow delete
    if (req.session && req.session.userId) {
      const validUserId = await getValidUserId(req.session.userId);
      
      // Check if user is author or admin
      if (post.author.toString() !== validUserId.toString() && !req.session.isAdmin) {
        return res.status(403).json({ 
          success: false, 
          message: 'No permission to delete this post' 
        });
      }
    }

    // Delete post comments
    await Comment.deleteMany({ post: post._id });

    // Delete post
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

// Comment API

// GET /api/posts/:postId/comments - Get all comments for a post
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
    console.error('API fetch comment list error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch comment list' 
    });
  }
});

// POST /api/posts/:postId/comments - Create comment (no authentication required)
router.post('/posts/:postId/comments', [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Comment content cannot be empty')
    .isLength({ max: 1000 })
    .withMessage('Comment content cannot exceed 1000 characters')
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
    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: 'Post not found' 
      });
    }

    // Handle user ID - use session if available, otherwise use anonymous user
    let validUserId;
    let authorName = 'Anonymous';
    
    if (req.session && req.session.userId) {
      validUserId = await getValidUserId(req.session.userId);
      authorName = req.session.username || 'Anonymous';
    } else {
      // Find or create anonymous user for API comments
      let anonymousUser = await User.findOne({ username: 'anonymous' });
      if (!anonymousUser) {
        anonymousUser = new User({
          username: 'anonymous',
          email: 'anonymous@example.com',
          password: 'anonymous'
        });
        await anonymousUser.save();
      }
      validUserId = anonymousUser._id;
    }
    
    const comment = new Comment({
      content,
      author: validUserId,
      authorName: authorName,
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

// DELETE /api/comments/:id - Delete comment (no authentication required)
router.delete('/comments/:id', async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Comment not found' 
      });
    }

    // If user is logged in, check permissions; otherwise allow delete
    if (req.session && req.session.userId) {
      const validUserId = await getValidUserId(req.session.userId);
      
      // Check if user is comment author or admin
      if (comment.author.toString() !== validUserId.toString() && !req.session.isAdmin) {
        return res.status(403).json({ 
          success: false, 
          message: 'No permission to delete this comment' 
        });
      }
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

// User API

// GET /api/users - Get all users (no authentication required)
router.get('/users', async (req, res) => {
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
    console.error('API fetch user list error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch user list' 
    });
  }
});

// GET /api/users/:id - Get single user information
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
      message: 'Failed to fetch user information' 
    });
  }
});


// Search API


// GET /api/search - Search posts
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

