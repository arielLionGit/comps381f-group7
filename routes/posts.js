const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { requireAuth } = require('../middleware/auth');
const upload = require('../config/upload');
const path = require('path');

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
    console.error('Error fetching posts:', error);
    res.status(500).render('error', {
      message: 'Unable to load posts',
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
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required'),
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
    // Convert images to Base64
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

    // Create post
    const post = new Post({
      title,
      content,
      author: req.session.userId,
      authorName: req.session.username,
      images,
      tags: tagArray
    });

    await post.save();

    res.redirect('/post/' + post._id);
  } catch (error) {
    console.error('Error creating post:', error);
    
    res.render('post-create', {
      errors: [{ msg: 'Failed to create post, please try again later' }],
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
        message: 'Post not found',
        error: { status: 404 },
        user: req.session ? req.session.username : null,
        isAdmin: req.session ? req.session.isAdmin : false
      });
    }

    // Increment view count
    await post.incrementViewCount();

    // Fetch comments
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
    console.error('Error loading post:', error);
    res.status(500).render('error', {
      message: 'Unable to load post',
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
        message: 'Post not found',
        error: { status: 404 },
        user: req.session.username,
        isAdmin: req.session.isAdmin
      });
    }

    // Ensure owner/admin
    if (post.author.toString() !== req.session.userId && !req.session.isAdmin) {
      return res.status(403).render('error', {
        message: 'You do not have permission to edit this post',
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
    console.error('Error loading edit page:', error);
    res.status(500).render('error', {
      message: 'Unable to load edit page',
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
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required'),
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

    // Ensure owner/admin
    if (post.author.toString() !== req.session.userId && !req.session.isAdmin) {
      return res.status(403).render('error', {
        message: 'You do not have permission to edit this post',
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

    // Remove selected images
    if (removeImages) {
      const imagesToRemove = Array.isArray(removeImages) ? removeImages : [removeImages];
      // Remove by index
      post.images = post.images.filter((img, index) => !imagesToRemove.includes(index.toString()));
    }

    // Handle new uploads (Base64)
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
    console.error('Error updating post:', error);
    
    const post = await Post.findById(req.params.id);
    res.render('post-edit', {
      post,
      errors: [{ msg: 'Failed to update post, please try again later' }],
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
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // 檢查是否為作者或管理員
    if (post.author.toString() !== req.session.userId && !req.session.isAdmin) {
      return res.status(403).json({ success: false, message: 'You do not have permission to delete this post' });
    }

    // 刪除文章的留言
    await Comment.deleteMany({ post: post._id });

    // 刪除文章
    await Post.findByIdAndDelete(req.params.id);

    res.redirect('/');
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ success: false, message: 'Failed to delete post' });
  }
});

module.exports = router;
