const mongoose = require('mongoose');

const userNewsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  articleUrl: {
    type: String,
    required: true
  },
  articleTitle: String,
  articleSource: String,
  articleImage: String,
  isRead: {
    type: Boolean,
    default: false
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  favoritedAt: Date
}, { 
  timestamps: true 
});

// Compound index to prevent duplicate user-article combinations
userNewsSchema.index({ userId: 1, articleUrl: 1 }, { unique: true });
userNewsSchema.index({ userId: 1, isRead: 1 });
userNewsSchema.index({ userId: 1, isFavorite: 1 });

module.exports = mongoose.model('UserNews', userNewsSchema);