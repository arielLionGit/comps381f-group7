const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Comment = require('./Comment');
const Post = require('./Post');
const User = require('./User');

// Authentication middleware - Check if user is logged in
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.redirect('/login');
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

// Create comment
router.post('/post/:postId/comment', requireAuth, [
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

    // Get valid user ID (handle admin case)
    const validUserId = await getValidUserId(req.session.userId);
    
    // Create comment
    const comment = new Comment({
      content,
      author: validUserId,
      authorName: req.session.username,
      post: postId
    });

    await comment.save();

    res.redirect('/post/' + postId);
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create comment, please try again later' 
    });
  }
});

// Delete comment
router.post('/comment/:id/delete', requireAuth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Comment not found' 
      });
    }

    // Get valid user ID (handle admin case)
    const validUserId = await getValidUserId(req.session.userId);
    
    // Check if user is comment author or admin
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
    console.error('Delete comment error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete comment' 
    });
  }
});

module.exports = router;


