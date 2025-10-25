const UserNews = require('../models/userNewsModel');

const markAsRead = async (userId, articleData) => {
  try {
    const { url, title, source, image } = articleData;

    if (!url) {
      throw new Error('Article URL is required');
    }

    const userNews = await UserNews.findOneAndUpdate(
      { userId, articleUrl: url },
      {
        userId,
        articleUrl: url,
        articleTitle: title,
        articleSource: source,
        articleImage: image,
        isRead: true,
        readAt: new Date()
      },
      { upsert: true, new: true }
    );

    return userNews;
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error - article already exists, just update it
      const userNews = await UserNews.findOneAndUpdate(
        { userId, articleUrl: articleData.url },
        { isRead: true, readAt: new Date() },
        { new: true }
      );
      return userNews;
    }
    throw error;
  }
};

const markAsFavorite = async (userId, articleData) => {
  try {
    const { url, title, source, image } = articleData;

    if (!url) {
      throw new Error('Article URL is required');
    }

    const userNews = await UserNews.findOneAndUpdate(
      { userId, articleUrl: url },
      {
        userId,
        articleUrl: url,
        articleTitle: title,
        articleSource: source,
        articleImage: image,
        isFavorite: true,
        favoritedAt: new Date()
      },
      { upsert: true, new: true }
    );

    return userNews;
  } catch (error) {
    if (error.code === 11000) {
      const userNews = await UserNews.findOneAndUpdate(
        { userId, articleUrl: articleData.url },
        { isFavorite: true, favoritedAt: new Date() },
        { new: true }
      );
      return userNews;
    }
    throw error;
  }
};

const removeFavorite = async (userId, articleUrl) => {
  if (!articleUrl) {
    throw new Error('Article URL is required');
  }

  const userNews = await UserNews.findOneAndUpdate(
    { userId, articleUrl },
    { isFavorite: false, favoritedAt: null },
    { new: true }
  );

  if (!userNews) {
    throw new Error('Article not found in your collection');
  }

  return userNews;
};

const getReadArticles = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const articles = await UserNews.find({ userId, isRead: true })
    .sort({ readAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await UserNews.countDocuments({ userId, isRead: true });

  return {
    articles,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalArticles: total,
      hasMore: skip + articles.length < total
    }
  };
};

const getFavoriteArticles = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const articles = await UserNews.find({ userId, isFavorite: true })
    .sort({ favoritedAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await UserNews.countDocuments({ userId, isFavorite: true });

  return {
    articles,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalArticles: total,
      hasMore: skip + articles.length < total
    }
  };
};

module.exports = {
  markAsRead,
  markAsFavorite,
  removeFavorite,
  getReadArticles,
  getFavoriteArticles
};