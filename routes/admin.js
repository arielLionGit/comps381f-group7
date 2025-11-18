const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { requireAdmin } = require('../middleware/auth');

// 管理員儀表板
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    // 獲取統計數據
    const totalUsers = await User.countDocuments();
    const totalPosts = await Post.countDocuments();
    const totalComments = await Comment.countDocuments();
    const bannedUsers = await User.countDocuments({ isBanned: true });

    // 獲取最近註冊的用戶
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('-password');

    // 獲取最活躍的用戶（依登入次數）
    const activeUsers = await User.find()
      .sort({ loginCount: -1 })
      .limit(10)
      .select('-password');

    // 獲取最近的文章
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
    console.error('載入管理員儀表板錯誤:', error);
    res.status(500).render('error', {
      message: '無法載入管理員儀表板',
      error: error,
      user: req.session.username,
      isAdmin: true
    });
  }
});

// 用戶管理頁面
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
    console.error('載入用戶列表錯誤:', error);
    res.status(500).render('error', {
      message: '無法載入用戶列表',
      error: error,
      user: req.session.username,
      isAdmin: true
    });
  }
});

// 禁止用戶
router.post('/users/:id/ban', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: '用戶不存在' 
      });
    }

    user.isBanned = true;
    await user.save();

    res.json({ 
      success: true, 
      message: '用戶已被禁止' 
    });
  } catch (error) {
    console.error('禁止用戶錯誤:', error);
    res.status(500).json({ 
      success: false, 
      message: '操作失敗' 
    });
  }
});

// 解除禁止用戶
router.post('/users/:id/unban', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: '用戶不存在' 
      });
    }

    user.isBanned = false;
    await user.save();

    res.json({ 
      success: true, 
      message: '已解除禁止' 
    });
  } catch (error) {
    console.error('解除禁止錯誤:', error);
    res.status(500).json({ 
      success: false, 
      message: '操作失敗' 
    });
  }
});

// 查看用戶詳情
router.get('/users/:id', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).render('error', {
        message: '用戶不存在',
        error: { status: 404 },
        user: req.session.username,
        isAdmin: true
      });
    }

    // 獲取用戶的文章
    const posts = await Post.find({ author: user._id })
      .sort({ createdAt: -1 })
      .limit(10);

    // 獲取用戶的留言
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
    console.error('載入用戶詳情錯誤:', error);
    res.status(500).render('error', {
      message: '無法載入用戶詳情',
      error: error,
      user: req.session.username,
      isAdmin: true
    });
  }
});

// 文章管理頁面
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
    console.error('載入文章列表錯誤:', error);
    res.status(500).render('error', {
      message: '無法載入文章列表',
      error: error,
      user: req.session.username,
      isAdmin: true
    });
  }
});

// 留言管理頁面
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
    console.error('載入留言列表錯誤:', error);
    res.status(500).render('error', {
      message: '無法載入留言列表',
      error: error,
      user: req.session.username,
      isAdmin: true
    });
  }
});

module.exports = router;
