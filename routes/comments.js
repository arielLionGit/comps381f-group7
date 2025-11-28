const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

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

// 建立留言
router.post('/post/:postId/comment', requireAuth, [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('The message content cannot be empty.')
    .isLength({ max: 1000 })
    .withMessage('The message content cannot exceed 1000 characters.')
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
        message: 'post does not exist' 
      });
    }

    // 獲取有效的用戶 ID（處理管理員情況）
    const validUserId = await getValidUserId(req.session.userId);
    
    // 建立留言
    const comment = new Comment({
      content,
      author: validUserId,
      authorName: req.session.username,
      post: postId
    });

    await comment.save();

    res.redirect('/post/' + postId);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create comment, please try again later' 
    });
  }
});

// 刪除留言
router.post('/comment/:id/delete', requireAuth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Comment not found' 
      });
    }

    // 獲取有效的用戶 ID（處理管理員情況）
    const validUserId = await getValidUserId(req.session.userId);
    
    // 檢查是否為留言作者或管理員
    if (comment.author.toString() !== validUserId.toString() && !req.session.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'No permission to delete this comment' 
      });
    }

    const postId = comment.post;
    await Comment.findByIdAndDelete(req.params.id);

    res.redirect('/post/' + postId);
  } catch (error) {
    console.error('Error delete comment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete comment' 
    });
  }
});

module.exports = router;
