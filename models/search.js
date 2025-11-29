const express = require('express');
const router = express.Router();
const Post = require('./Post');

// Search page
router.get('/search', async (req, res) => {
  try {
    const { 
      q: query, 
      caseSensitive, 
      startDate, 
      endDate, 
      tags 
    } = req.query;

    // If no search conditions, display empty search page
    if (!query && !startDate && !endDate && !tags) {
      return res.render('search', {
        posts: [],
        searchQuery: '',
        caseSensitive: false,
        startDate: '',
        endDate: '',
        tags: '',
        user: req.session ? req.session.username : null,
        isAdmin: req.session ? req.session.isAdmin : false
      });
    }

    // Build search conditions
    const searchConditions = [];

    // Text search (title or content)
    if (query) {
      const regex = caseSensitive === 'true' 
        ? new RegExp(query) 
        : new RegExp(query, 'i');
      
      searchConditions.push({
        $or: [
          { title: regex },
          { content: regex }
        ]
      });
    }

    // Date range search
    if (startDate || endDate) {
      const dateCondition = {};
      
      if (startDate) {
        dateCondition.$gte = new Date(startDate);
      }
      
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        dateCondition.$lte = endDateTime;
      }
      
      if (Object.keys(dateCondition).length > 0) {
        searchConditions.push({ createdAt: dateCondition });
      }
    }

    // Tag search
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag);
      if (tagArray.length > 0) {
        searchConditions.push({
          tags: { $in: tagArray }
        });
      }
    }

    // Execute search
    const searchFilter = searchConditions.length > 0 
      ? { $and: searchConditions } 
      : {};

    const posts = await Post.find(searchFilter)
      .sort({ createdAt: -1 })
      .populate('author', 'username')
      .limit(50);

    res.render('search', {
      posts,
      searchQuery: query || '',
      caseSensitive: caseSensitive === 'true',
      startDate: startDate || '',
      endDate: endDate || '',
      tags: tags || '',
      user: req.session ? req.session.username : null,
      isAdmin: req.session ? req.session.isAdmin : false
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).render('error', {
      message: 'Search failed',
      error: error,
      user: req.session ? req.session.username : null,
      isAdmin: req.session ? req.session.isAdmin : false
    });
  }
});

// Browse by tag
router.get('/tag/:tag', async (req, res) => {
  try {
    const tag = req.params.tag.toLowerCase();
    
    const posts = await Post.find({ tags: tag })
      .sort({ createdAt: -1 })
      .populate('author', 'username');

    res.render('tag', {
      posts,
      tag,
      user: req.session ? req.session.username : null,
      isAdmin: req.session ? req.session.isAdmin : false
    });
  } catch (error) {
    console.error('Tag page error:', error);
    res.status(500).render('error', {
      message: 'Failed to load tag posts',
      error: error,
      user: req.session ? req.session.username : null,
      isAdmin: req.session ? req.session.isAdmin : false
    });
  }
});

module.exports = router;

