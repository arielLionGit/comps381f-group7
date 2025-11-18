const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const { requireAuth } = require('../middleware/auth');

// 建立留言
router.post('/post/:postId/comment', requireAuth, [
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

    // 建立留言
    const comment = new Comment({
      content,
      author: req.session.userId,
      authorName: req.session.username,
      post: postId
    });

    await comment.save();

    res.redirect('/post/' + postId);
  } catch (error) {
    console.error('建立留言錯誤:', error);
    res.status(500).json({ 
      success: false, 
      message: '建立留言失敗，請稍後再試' 
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
        message: '留言不存在' 
      });
    }

    // 檢查是否為留言作者或管理員
    if (comment.author.toString() !== req.session.userId && !req.session.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: '無權限刪除此留言' 
      });
    }

    const postId = comment.post;
    await Comment.findByIdAndDelete(req.params.id);

    res.redirect('/post/' + postId);
  } catch (error) {
    console.error('刪除留言錯誤:', error);
    res.status(500).json({ 
      success: false, 
      message: '刪除留言失敗' 
    });
  }
});

module.exports = router;
