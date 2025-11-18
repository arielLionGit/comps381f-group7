const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { requireAdmin } = require('../middleware/auth');

// Admin dashboard
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    // Stats
    const totalUsers = await User.countDocuments();
    const totalPosts = await Post.countDocuments();
    const totalComments = await Comment.countDocuments();
    const bannedUsers = await User.countDocuments({ isBanned: true });

    // Recent users
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('-password');

    // Most active users
    const activeUsers = await User.find()
      .sort({ loginCount: -1 })
      .limit(10)
      .select('-password');

    // Recent posts
    const recentPosts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('author', 'username');

    res.render('admin/dashboard', {
      stats: {
        totalUsers,
        totalPosts,
        totalComments,
        bannedUsers
      },
      recentUsers,
      activeUsers,
      recentPosts,
      user: req.session.username,
      isAdmin: true
    });
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    res.status(500).render('error', {
      message: 'Unable to load admin dashboard',
      error: error,
      user: req.session.username,
      isAdmin: true
    });
  }
});

// User management
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const totalUsers = await User.countDocuments();
    const users = await User.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-password');

    const totalPages = Math.ceil(totalUsers / limit);

    res.render('admin/users', {
      users,
      currentPage: page,
      totalPages,
      user: req.session.username,
      isAdmin: true
    });
  } catch (error) {
    console.error('Error loading user list:', error);
    res.status(500).render('error', {
      message: 'Unable to load user list',
      error: error,
      user: req.session.username,
      isAdmin: true
    });
  }
});

// Ban user
router.post('/users/:id/ban', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    user.isBanned = true;
    await user.save();

    res.json({ 
      success: true, 
      message: 'User has been banned' 
    });
  } catch (error) {
    console.error('Error banning user:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Operation failed' 
    });
  }
});

// Unban user
router.post('/users/:id/unban', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    user.isBanned = false;
    await user.save();

    res.json({ 
      success: true, 
      message: 'User has been unbanned' 
    });
  } catch (error) {
    console.error('Error unbanning user:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Operation failed' 
    });
  }
});

// User detail
router.get('/users/:id', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).render('error', {
        message: 'User not found',
        error: { status: 404 },
        user: req.session.username,
        isAdmin: true
      });
    }

    // User posts
    const posts = await Post.find({ author: user._id })
      .sort({ createdAt: -1 })
      .limit(10);

    // User comments
    const comments = await Comment.find({ author: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('post', 'title');

    res.render('admin/user-detail', {
      targetUser: user,
      posts,
      comments,
      user: req.session.username,
      isAdmin: true
    });
  } catch (error) {
    console.error('Error loading user detail:', error);
    res.status(500).render('error', {
      message: 'Unable to load user detail',
      error: error,
      user: req.session.username,
      isAdmin: true
    });
  }
});

// Post management
router.get('/posts', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const totalPosts = await Post.countDocuments();
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username');

    const totalPages = Math.ceil(totalPosts / limit);

    res.render('admin/posts', {
      posts,
      currentPage: page,
      totalPages,
      user: req.session.username,
      isAdmin: true
    });
  } catch (error) {
    console.error('Error loading post list:', error);
    res.status(500).render('error', {
      message: 'Unable to load post list',
      error: error,
      user: req.session.username,
      isAdmin: true
    });
  }
});

// Comment management
router.get('/comments', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const totalComments = await Comment.countDocuments();
    const comments = await Comment.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username')
      .populate('post', 'title');

    const totalPages = Math.ceil(totalComments / limit);

    res.render('admin/comments', {
      comments,
      currentPage: page,
      totalPages,
      user: req.session.username,
      isAdmin: true
    });
  } catch (error) {
    console.error('Error loading comment list:', error);
    res.status(500).render('error', {
      message: 'Unable to load comment list',
      error: error,
      user: req.session.username,
      isAdmin: true
    });
  }
});

module.exports = router;
