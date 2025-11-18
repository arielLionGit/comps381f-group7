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
    // Ensure post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: 'Post not found' 
      });
    }

    // Create comment
    const comment = new Comment({
      content,
      author: req.session.userId,
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

    // Ensure owner/admin
    if (comment.author.toString() !== req.session.userId && !req.session.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to delete this comment' 
      });
    }

    const postId = comment.post;
    await Comment.findByIdAndDelete(req.params.id);

    res.redirect('/post/' + postId);
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete comment' 
    });
  }
});

module.exports = router;
