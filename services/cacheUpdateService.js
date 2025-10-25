const NewsCache = require('../utils/cache');
const usersModel = require('../models/usersModel');
const newsController = require('../controllers/newsController');

class CacheUpdateService {
  constructor() {
    this.isRunning = false;
    this.updateInterval = 15 * 60 * 1000; // 15 minutes
    this.intervalId = null;
  }

  async updateCacheForAllUsers() {
    if (this.isRunning) {
      console.log('⏳ Cache update already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('\n🔄 Starting periodic cache update...');

    try {
      // Get all unique preference combinations
      const users = await usersModel.find({}, 'newsPreferences');
      
      if (!users || users.length === 0) {
        console.log('No users found, skipping cache update');
        this.isRunning = false;
        return;
      }

      // Create a Set to track unique preference combinations
      const preferenceSet = new Set();
      const uniquePreferences = [];

      users.forEach(user => {
        const prefs = user.newsPreferences;
        const categories = prefs.categories || ['general'];
        
        categories.forEach(category => {
          const key = `${category}-${prefs.country || 'us'}-${prefs.language || 'en'}`;
          
          if (!preferenceSet.has(key)) {
            preferenceSet.add(key);
            uniquePreferences.push({
              categories: [category],
              country: prefs.country || 'us',
              language: prefs.language || 'en'
            });
          }
        });
      });

      console.log(`📊 Found ${uniquePreferences.length} unique preference combinations to update`);

      // Update cache for each unique preference combination
      let successCount = 0;
      let errorCount = 0;

      for (const prefs of uniquePreferences) {
        try {
          await newsController.fetchNews(null, prefs);
          successCount++;
          console.log(`✓ Updated cache for: ${prefs.categories[0]} (${prefs.country}/${prefs.language})`);
          
          // Small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          errorCount++;
          console.error(`✗ Failed to update cache for ${prefs.categories[0]}:`, error.message);
        }
      }

      // Clean up expired cache
      await NewsCache.clearExpiredCache();

      console.log(`\n✅ Cache update completed: ${successCount} successful, ${errorCount} failed`);
    } catch (error) {
      console.error('❌ Error in cache update service:', error);
    } finally {
      this.isRunning = false;
    }
  }

  start() {
    if (this.intervalId) {
      console.log('⚠️  Cache update service is already running');
      return;
    }

    console.log(`🚀 Starting cache update service (every ${this.updateInterval / 1000 / 60} minutes)`);
    
    // Run immediately on start
    this.updateCacheForAllUsers();
    
    // Then run periodically
    this.intervalId = setInterval(() => {
      this.updateCacheForAllUsers();
    }, this.updateInterval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Cache update service stopped');
    }
  }
}

module.exports = new CacheUpdateService();