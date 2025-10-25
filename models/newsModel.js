const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  source: {
    id: String,
    name: String
  },
  author: String,
  title: {
    type: String,
    required: true
  },
  description: String,
  url: {
    type: String,
    required: true,
    unique: true
  },
  urlToImage: String,
  publishedAt: Date,
  content: String,
  category: String,
  country: String,
  language: String,
  // Cache metadata
  fetchedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    index: true
  }
}, { 
  timestamps: true 
});

// Index for faster queries
newsSchema.index({ category: 1, country: 1, language: 1, fetchedAt: -1 });
newsSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-deletion

module.exports = mongoose.model('News', newsSchema);