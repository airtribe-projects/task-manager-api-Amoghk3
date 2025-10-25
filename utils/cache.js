const News = require('../models/newsModel');

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

class NewsCache {
  // Get cached news from database
  static async getCachedNews(category, country, language) {
    try {
      const now = new Date();
      const cacheExpiry = new Date(now.getTime() - CACHE_DURATION);

      const cachedNews = await News.find({
        category: category,
        country: country,
        language: language,
        fetchedAt: { $gte: cacheExpiry }
      }).sort({ publishedAt: -1 });

      if (cachedNews && cachedNews.length > 0) {
        console.log(`✓ Cache HIT: Found ${cachedNews.length} cached articles`);
        return {
          articles: cachedNews,
          fromCache: true
        };
      }

      console.log('✗ Cache MISS: No cached articles found');
      return null;
    } catch (error) {
      console.error('Cache retrieval error:', error);
      return null;
    }
  }

  // Store news in cache
  static async setCachedNews(articles, category, country, language) {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + CACHE_DURATION);

      // Remove old cache entries for this category/country/language
      await News.deleteMany({
        category: category,
        country: country,
        language: language
      });

      // Prepare articles for caching
      const newsToCache = articles.map(article => ({
        source: article.source,
        author: article.author,
        title: article.title,
        description: article.description,
        url: article.url,
        urlToImage: article.urlToImage,
        publishedAt: article.publishedAt,
        content: article.content,
        category: category,
        country: country,
        language: language,
        fetchedAt: now,
        expiresAt: expiresAt
      }));

      // Insert new cache entries (ignore duplicates)
      await News.insertMany(newsToCache, { ordered: false })
        .catch(err => {
          // Ignore duplicate key errors
          if (err.code !== 11000) throw err;
        });

      console.log(`✓ Cached ${articles.length} articles`);
      return true;
    } catch (error) {
      console.error('Cache storage error:', error);
      return false;
    }
  }

  // Search in cache
  static async searchCachedNews(keyword, language) {
    try {
      const now = new Date();
      const cacheExpiry = new Date(now.getTime() - CACHE_DURATION);

      const cachedNews = await News.find({
        language: language,
        fetchedAt: { $gte: cacheExpiry },
        $or: [
          { title: { $regex: keyword, $options: 'i' } },
          { description: { $regex: keyword, $options: 'i' } },
          { content: { $regex: keyword, $options: 'i' } }
        ]
      }).sort({ publishedAt: -1 }).limit(20);

      if (cachedNews && cachedNews.length > 0) {
        console.log(`✓ Search Cache HIT: Found ${cachedNews.length} articles`);
        return {
          articles: cachedNews,
          fromCache: true
        };
      }

      return null;
    } catch (error) {
      console.error('Cache search error:', error);
      return null;
    }
  }

  // Clear expired cache
  static async clearExpiredCache() {
    try {
      const result = await News.deleteMany({
        expiresAt: { $lt: new Date() }
      });
      console.log(`🗑️  Cleared ${result.deletedCount} expired cache entries`);
      return result.deletedCount;
    } catch (error) {
      console.error('Cache cleanup error:', error);
      return 0;
    }
  }
}

module.exports = NewsCache;