const express = require('express');
const router = express.Router();
const Post = require('../models/Post');

// 搜尋頁面
router.get('/search', async (req, res) => {
  try {
    const { 
      q: query, 
      caseSensitive, 
      startDate, 
      endDate, 
      tags 
    } = req.query;

    // 如果沒有搜尋條件，顯示空搜尋頁面
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

    // 建立搜尋條件
    const searchConditions = [];

    // 文字搜尋（標題或內容）
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

    // 日期範圍搜尋
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

    // 標籤搜尋
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag);
      if (tagArray.length > 0) {
        searchConditions.push({
          tags: { $in: tagArray }
        });
      }
    }

    // 執行搜尋
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
    console.error('搜尋錯誤:', error);
    res.status(500).render('error', {
      message: '搜尋失敗',
      error: error,
      user: req.session ? req.session.username : null,
      isAdmin: req.session ? req.session.isAdmin : false
    });
  }
});

// 依標籤瀏覽
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
    console.error('標籤瀏覽錯誤:', error);
    res.status(500).render('error', {
      message: '載入標籤文章失敗',
      error: error,
      user: req.session ? req.session.username : null,
      isAdmin: req.session ? req.session.isAdmin : false
    });
  }
});

module.exports = router;
