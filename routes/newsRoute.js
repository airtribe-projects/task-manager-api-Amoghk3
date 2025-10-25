const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');
const userNewsController = require('../controllers/userNewsController');
const usersModel = require('../models/usersModel');
const validateJWT = require('../middleware/authMiddleware');

// Get news based on user preferences
router.get('/', validateJWT, async (req, res) => {
  try {
    const user = await usersModel.findById(req.user.id).select('newsPreferences');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    const newsData = await newsController.fetchNews(req.user.id, user.newsPreferences);
    
    res.status(200).json({
      success: true,
      data: newsData
    });
  } catch (error) {
    console.error('Error fetching news:', error.message);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to fetch news articles'
    });
  }
});

// Search news articles - Updated route from /search to /search/:keyword
router.get('/search/:keyword', validateJWT, async (req, res) => {
  try {
    const { keyword } = req.params;
    
    if (!keyword || keyword.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search keyword is required'
      });
    }

    const user = await usersModel.findById(req.user.id).select('newsPreferences');
    
    const newsData = await newsController.searchNews(keyword, user?.newsPreferences);
    
    res.status(200).json({
      success: true,
      data: newsData
    });
  } catch (error) {
    console.error('Error searching news:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to search news articles'
    });
  }
});

// Mark article as read
router.post('/:id/read', validateJWT, async (req, res) => {
  try {
    const { url, title, source, image } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'Article URL is required'
      });
    }

    const result = await userNewsController.markAsRead(req.user.id, {
      url,
      title,
      source,
      image
    });

    res.status(200).json({
      success: true,
      message: 'Article marked as read',
      data: result
    });
  } catch (error) {
    console.error('Error marking as read:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to mark article as read'
    });
  }
});

// Mark article as favorite
router.post('/:id/favorite', validateJWT, async (req, res) => {
  try {
    const { url, title, source, image } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'Article URL is required'
      });
    }

    const result = await userNewsController.markAsFavorite(req.user.id, {
      url,
      title,
      source,
      image
    });

    res.status(200).json({
      success: true,
      message: 'Article marked as favorite',
      data: result
    });
  } catch (error) {
    console.error('Error marking as favorite:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to mark article as favorite'
    });
  }
});

// Remove article from favorites
router.delete('/:id/favorite', validateJWT, async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'Article URL is required'
      });
    }

    const result = await userNewsController.removeFavorite(req.user.id, url);

    res.status(200).json({
      success: true,
      message: 'Article removed from favorites',
      data: result
    });
  } catch (error) {
    console.error('Error removing favorite:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to remove article from favorites'
    });
  }
});

// Get all read articles
router.get('/read', validateJWT, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await userNewsController.getReadArticles(req.user.id, page, limit);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching read articles:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch read articles'
    });
  }
});

// Get all favorite articles
router.get('/favorites', validateJWT, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await userNewsController.getFavoriteArticles(req.user.id, page, limit);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching favorite articles:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch favorite articles'
    });
  }
});

module.exports = router;