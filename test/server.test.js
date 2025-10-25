// test/server.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app'); // must export express app from app.js
const User = require('../models/usersModel');
const UserNews = require('../models/userNewsModel');
const News = require('../models/newsModel');

jest.setTimeout(20000); // allow some extra time for DB ops

// Test user data
const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'test123456',
  newsPreferences: {
    categories: ['technology'],
    country: 'us',
    language: 'en'
  }
};

let authToken;
let userId;
let sampleArticle;

beforeAll(async () => {
  // Choose test DB URI if provided
  const testDbUri = process.env.MONGODB_URI_TEST || process.env.MONGODB_URI;
  if (!testDbUri) {
    throw new Error('Please set MONGODB_URI_TEST or MONGODB_URI in your environment for tests');
  }

  // connect if not already connected
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(testDbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }
});

beforeEach(async () => {
  // clear collections
  await User.deleteMany({});
  await UserNews.deleteMany({});
  await News.deleteMany({});

  // Register and login user for tests
  await request(app)
    .post('/api/users/register')
    .send(testUser)
    .expect(201);

  const loginResponse = await request(app)
    .post('/api/users/login')
    .send({
      email: testUser.email,
      password: testUser.password
    })
    .expect(200);

  authToken = loginResponse.body.token;
  userId = loginResponse.body.user.id;

  // Create a News document in DB — required because routes expect a news id
  sampleArticle = await News.create({
    title: 'Test Article',
    url: `https://example.com/article-${Date.now()}`, // unique URL to avoid unique index errors
    source: { id: null, name: 'Test Source' },
    urlToImage: 'https://example.com/image.jpg',
    description: 'Sample article used in tests',
    content: 'Test content',
    category: 'technology',
    country: 'us',
    language: 'en',
    publishedAt: new Date()
  });
});

afterEach(async () => {
  // clear data created during test (keeps tests isolated)
  await User.deleteMany({});
  await UserNews.deleteMany({});
  await News.deleteMany({});
});

afterAll(async () => {
  // drop test DB (optional) and close connection
  try {
    // only drop when using a dedicated test DB — be cautious
    if (process.env.MONGODB_URI_TEST) {
      await mongoose.connection.dropDatabase();
    }
  } catch (err) {
    console.warn('Warning: could not drop database', err.message);
  }

  await mongoose.connection.close();

  // If app exposed a server for tests, close it (optional)
  if (app && app.closeServer instanceof Function) {
    // close server if the app exported helper
    await app.closeServer();
  }
});

describe('Health Check Endpoint', () => {
  test('GET /health should return server status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('mongodb');
  });

  test('GET / should return API overview', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('endpoints');
  });
});

describe('User Registration and Login', () => {
  test('POST /api/users/register should create a new user (duplicate handled in beforeEach)', async () => {
    // Already registered in beforeEach, ensure registration fails on duplicate
    const response = await request(app)
      .post('/api/users/register')
      .send(testUser)
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  test('POST /api/users/login should return JWT token', async () => {
    const response = await request(app)
      .post('/api/users/login')
      .send({
        email: testUser.email,
        password: testUser.password
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('email', testUser.email);
  });

  test('POST /api/users/login should fail with wrong password', async () => {
    const response = await request(app)
      .post('/api/users/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword'
      })
      .expect(400);

    expect(response.body.success).toBe(false);
  });
});

describe('Authentication Middleware', () => {
  test('GET /api/news should fail without token', async () => {
    const response = await request(app)
      .get('/api/news')
      .expect(401);

    expect(response.body.success).toBe(false);
  });

  test('GET /api/news should fail with invalid token', async () => {
    const response = await request(app)
      .get('/api/news')
      .set('Authorization', 'Bearer invalid_token')
      .expect(401);

    expect(response.body.success).toBe(false);
  });
});

describe('News Endpoints (Authenticated)', () => {
  test('GET /api/news should return news articles', async () => {
    const response = await request(app)
      .get('/api/news')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  }, 10000);

  test('GET /api/news/search/:keyword should search news', async () => {
    const response = await request(app)
      .get('/api/news/search/technology')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  }, 10000);
});

describe('User News Actions', () => {
  test('POST /api/news/:id/read should mark article as read', async () => {
    const payload = {
      url: sampleArticle.url,
      title: sampleArticle.title,
      source: sampleArticle.source.name,
      image: sampleArticle.urlToImage
    };

    const response = await request(app)
      .post(`/api/news/${sampleArticle._id}/read`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toMatch(/marked as read/i);

    // Verify the UserNews entry exists
    const dbEntry = await UserNews.findOne({ userId, articleUrl: sampleArticle.url });
    expect(dbEntry).not.toBeNull();
    expect(dbEntry.isRead).toBe(true);
  });

  test('POST /api/news/:id/favorite should mark article as favorite', async () => {
    const payload = {
      url: sampleArticle.url,
      title: sampleArticle.title,
      source: sampleArticle.source.name,
      image: sampleArticle.urlToImage
    };

    const response = await request(app)
      .post(`/api/news/${sampleArticle._id}/favorite`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toMatch(/marked as favorite/i);

    const dbEntry = await UserNews.findOne({ userId, articleUrl: sampleArticle.url });
    expect(dbEntry).not.toBeNull();
    expect(dbEntry.isFavorite).toBe(true);
  });

  test('GET /api/news/read should get read articles', async () => {
    // mark read
    await request(app)
      .post(`/api/news/${sampleArticle._id}/read`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        url: sampleArticle.url,
        title: sampleArticle.title,
        source: sampleArticle.source.name,
        image: sampleArticle.urlToImage
      });

    const response = await request(app)
      .get('/api/news/read')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data.articles || response.body.data)).toBeTruthy();
  });

  test('GET /api/news/favorites should get favorite articles', async () => {
    // mark favorite
    await request(app)
      .post(`/api/news/${sampleArticle._id}/favorite`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        url: sampleArticle.url,
        title: sampleArticle.title,
        source: sampleArticle.source.name,
        image: sampleArticle.urlToImage
      });

    const response = await request(app)
      .get('/api/news/favorites')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data.articles || response.body.data)).toBeTruthy();
  });

  test('DELETE /api/news/:id/favorite should remove article from favorites', async () => {
    // mark favorite first
    await request(app)
      .post(`/api/news/${sampleArticle._id}/favorite`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        url: sampleArticle.url,
        title: sampleArticle.title,
        source: sampleArticle.source.name,
        image: sampleArticle.urlToImage
      });

    const response = await request(app)
      .delete(`/api/news/${sampleArticle._id}/favorite`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ url: sampleArticle.url })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toMatch(/removed from favorites/i);

    const dbEntry = await UserNews.findOne({ userId, articleUrl: sampleArticle.url });
    // Depending on controller logic, either removed or updated; check either behavior:
    if (dbEntry) {
      expect(dbEntry.isFavorite).toBe(false);
    }
  });
});
