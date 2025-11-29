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
        password: '123456' // This password won't be used, as admin logs in through special logic
      });
      await adminUser.save();
    }
    return adminUser._id;
  }
  
  return sessionUserId;
};

// Homepage - Display all posts
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
    console.error('Fetch post list error:', error);
    res.status(500).render('error', {
      message: 'Unable to load post list',
      error: error,
      user: req.session ? req.session.username : null,
      isAdmin: req.session ? req.session.isAdmin : false
    });
  }
});

// Display create post page
router.get('/create', requireAuth, (req, res) => {
  res.render('post-create', {
    errors: [],
    user: req.session.username,
    isAdmin: req.session.isAdmin
  });
});

// Handle create post
router.post('/create', requireAuth, upload.array('images', 5), [
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
    // Process images - convert to Base64
    const images = req.files ? req.files.map(file => {
      const base64Data = file.buffer.toString('base64');
      const dataUri = `data:${file.mimetype};base64,${base64Data}`;
      return {
        filename: file.originalname || `image_${Date.now()}_${Math.round(Math.random() * 1E9)}${path.extname(file.originalname || '')}`,
        mimetype: file.mimetype,
        data: dataUri
      };
    }) : [];

    // Process tags
    const tagArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    // Get valid user ID (handle admin case)
    const validUserId = await getValidUserId(req.session.userId);

    // Create post
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
    console.error('Create post error:', error);
    
    res.render('post-create', {
      errors: [{ msg: 'Failed to create post, please try again later' }],
      user: req.session.username,
      isAdmin: req.session.isAdmin
    });
  }
});

// Display single post
router.get('/post/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'username');
    
    if (!post) {
      return res.status(404).render('error', {
        message: 'Post not found',
        error: { status: 404 },
        user: req.session ? req.session.username : null,
        isAdmin: req.session ? req.session.isAdmin : false
      });
    }

    // Increment view count
    await post.incrementViewCount();

    // Get comments
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
    console.error('Fetch post error:', error);
    res.status(500).render('error', {
      message: 'Unable to load post',
      error: error,
      user: req.session ? req.session.username : null,
      isAdmin: req.session ? req.session.isAdmin : false
    });
  }
});

// Display edit post page
router.get('/post/:id/edit', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).render('error', {
        message: 'Post not found',
        error: { status: 404 },
        user: req.session.username,
        isAdmin: req.session.isAdmin
      });
    }

    // Get valid user ID (handle admin case)
    const validUserId = await getValidUserId(req.session.userId);
    
    // Check if user is author or admin
    if (post.author.toString() !== validUserId.toString() && !req.session.isAdmin) {
      return res.status(403).render('error', {
        message: 'No permission to edit this post',
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
    console.error('Load edit page error:', error);
    res.status(500).render('error', {
      message: 'Unable to load edit page',
      error: error,
      user: req.session.username,
      isAdmin: req.session.isAdmin
    });
  }
});

// Handle edit post
router.post('/post/:id/edit', requireAuth, upload.array('images', 5), [
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
    .trim()
], async (req, res) => {
  const errors = validationResult(req);
  
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).render('error', {
        message: 'Post not found',
        error: { status: 404 },
        user: req.session.username,
        isAdmin: req.session.isAdmin
      });
    }

    // Get valid user ID (handle admin case)
    const validUserId = await getValidUserId(req.session.userId);
    
    // Check if user is author or admin
    if (post.author.toString() !== validUserId.toString() && !req.session.isAdmin) {
      return res.status(403).render('error', {
        message: 'No permission to edit this post',
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

    // Process images to remove (by index or filename)
    if (removeImages) {
      const imagesToRemove = Array.isArray(removeImages) ? removeImages : [removeImages];
      // If removeImages is an index array, filter out corresponding images
      post.images = post.images.filter((img, index) => !imagesToRemove.includes(index.toString()));
    }

    // Process newly uploaded images - convert to Base64
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

    // Process tags
    const tagArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    // Update post
    post.title = title;
    post.content = content;
    post.tags = tagArray;
    post.updatedAt = Date.now();

    await post.save();

    res.redirect('/post/' + post._id);
  } catch (error) {
    console.error('Update post error:', error);
    
    const post = await Post.findById(req.params.id);
    res.render('post-edit', {
      post,
      errors: [{ msg: 'Failed to update post, please try again later' }],
      user: req.session.username,
      isAdmin: req.session.isAdmin
    });
  }
});

// Delete post
router.post('/post/:id/delete', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Get valid user ID (handle admin case)
    const validUserId = await getValidUserId(req.session.userId);
    
    // Check if user is author or admin
    if (post.author.toString() !== validUserId.toString() && !req.session.isAdmin) {
      return res.status(403).json({ success: false, message: 'No permission to delete this post' });
    }

    // Delete post comments
    await Comment.deleteMany({ post: post._id });

    // Delete post
    await Post.findByIdAndDelete(req.params.id);

    res.redirect('/');
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete post' });
  }
});

module.exports = router;
