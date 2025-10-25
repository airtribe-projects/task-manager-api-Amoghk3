const axios = require('axios');
const NewsCache = require('../utils/cache');

const NEWS_API_BASE_URL = 'https://newsapi.org/v2';
const NEWS_API_KEY = process.env.NEWS_API_KEY;

const fetchNews = async (userId, userPreferences) => {
  try {
    if (!NEWS_API_KEY) {
      throw new Error('News API key is not configured');
    }

    const { categories, country, language } = userPreferences || {};
    const category = categories && categories.length > 0 ? categories[0] : 'general';
    const countryCode = country || 'us';
    const lang = language || 'en';

    // Try to get from cache first
    const cachedNews = await NewsCache.getCachedNews(category, countryCode, lang);
    if (cachedNews) {
      return {
        status: 'ok',
        totalResults: cachedNews.articles.length,
        articles: cachedNews.articles,
        fromCache: true,
        preferences: {
          category,
          country: countryCode,
          language: lang
        }
      };
    }

    // Fetch from API if not in cache
    const response = await axios.get(`${NEWS_API_BASE_URL}/top-headlines`, {
      params: {
        apiKey: NEWS_API_KEY,
        country: countryCode,
        language: lang,
        category: category,
        pageSize: 20
      },
      timeout: 5000
    });

    if (response.data.status === 'error') {
      throw new Error(response.data.message || 'News API returned an error');
    }

    // Cache the fetched news
    await NewsCache.setCachedNews(response.data.articles, category, countryCode, lang);

    return {
      status: 'ok',
      totalResults: response.data.totalResults,
      articles: response.data.articles,
      fromCache: false,
      preferences: {
        category,
        country: countryCode,
        language: lang
      }
    };
  } catch (error) {
    console.error('News fetch error:', error.message);
    
    if (error.response) {
      const statusCode = error.response.status;
      const message = error.response.data?.message || 'Failed to fetch news';
      
      if (statusCode === 401) {
        throw new Error('Invalid News API key. Please check your configuration.');
      } else if (statusCode === 429) {
        throw new Error('News API rate limit exceeded. Please try again later.');
      }
      
      throw new Error(`News API Error: ${message}`);
    } else if (error.request) {
      throw new Error('No response from News API. Please check your internet connection.');
    } else {
      throw new Error(error.message || 'Failed to fetch news articles');
    }
  }
};

const searchNews = async (query, userPreferences) => {
  try {
    if (!NEWS_API_KEY) {
      throw new Error('News API key is not configured');
    }

    if (!query || query.trim().length === 0) {
      throw new Error('Search query is required');
    }

    const sanitizedQuery = query.trim();
    const { language } = userPreferences || {};
    const lang = language || 'en';

    // Try cache first
    const cachedResults = await NewsCache.searchCachedNews(sanitizedQuery, lang);
    if (cachedResults) {
      return {
        status: 'ok',
        totalResults: cachedResults.articles.length,
        articles: cachedResults.articles,
        query: sanitizedQuery,
        fromCache: true
      };
    }

    // Fetch from API
    const response = await axios.get(`${NEWS_API_BASE_URL}/everything`, {
      params: {
        apiKey: NEWS_API_KEY,
        q: sanitizedQuery,
        language: lang,
        sortBy: 'publishedAt',
        pageSize: 20
      },
      timeout: 5000
    });

    if (response.data.status === 'error') {
      throw new Error(response.data.message || 'News API returned an error');
    }

    return {
      status: 'ok',
      totalResults: response.data.totalResults,
      articles: response.data.articles,
      query: sanitizedQuery,
      fromCache: false
    };
  } catch (error) {
    console.error('News search error:', error.message);
    
    if (error.response) {
      const statusCode = error.response.status;
      const message = error.response.data?.message || 'Failed to search news';
      
      if (statusCode === 401) {
        throw new Error('Invalid News API key. Please check your configuration.');
      } else if (statusCode === 429) {
        throw new Error('News API rate limit exceeded. Please try again later.');
      }
      
      throw new Error(`News API Error: ${message}`);
    } else if (error.request) {
      throw new Error('No response from News API. Please check your internet connection.');
    } else {
      throw new Error(error.message || 'Failed to search news articles');
    }
  }
};

module.exports = { 
  fetchNews, 
  searchNews 
};