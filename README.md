# News Aggregator API

A comprehensive RESTful API for aggregating and managing news articles from various sources. Built with Node.js, Express, MongoDB, and NewsAPI integration.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Reference](#api-reference)
  - [Authentication](#authentication)
  - [User endpoints](#user-endpoints)
  - [News endpoints](#news-endpoints)
  - [User News actions](#user-news-actions)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Caching System](#caching-system)
- [License](#license)
- [Author](#author)
- [Acknowledgments](#acknowledgments)

---

## ✨ Features

- **User Authentication**: JWT-based authentication with bcrypt password hashing
- **News Aggregation**: Fetch news from NewsAPI based on user preferences
- **Intelligent Caching**: MongoDB-based caching system (configurable TTL) to reduce API calls
- **Personalization**: User-specific news preferences (categories, country, language)
- **Reading History**: Track read articles with timestamps
- **Favorites Management**: Save and manage favorite articles
- **Advanced Search**: Search news articles by keywords
- **Background Updates**: Periodic cache refresh (configurable)
- **Input Validation**: Validation for user inputs
- **Error Handling**: Robust error handling with logging

---

## 🛠 Tech Stack

- **Runtime**: Node.js  
- **Framework**: Express.js  
- **Database**: MongoDB with Mongoose ODM  
- **Authentication**: JWT (jsonwebtoken)  
- **Password Hashing**: bcrypt  
- **External API**: NewsAPI.org  
- **HTTP Client**: Axios  
- **Testing**: Jest & Supertest  
- **Dev Tools**: Nodemon

---

## 📦 Prerequisites

- Node.js v14+  
- npm v6+  
- MongoDB (local or Atlas)  
- NewsAPI Key (from https://newsapi.org)

---

## 🚀 Installation

```bash
git clone https://github.com/airtribe-projects/task-manager-api-Amoghk3.git
cd task-manager-api-Amoghk3
npm install
cp .env.sample .env
# edit .env with appropriate values
```

---

## ⚙️ Configuration

Edit `.env` with:

```
PORT=3000
MONGODB_URI=your_mongodb_uri
MONGODB_URI_TEST=your_test_mongodb_uri
JWT_SECRET=your_jwt_secret
SALT_ROUNDS=10
NEWS_API_KEY=your_newsapi_key
NODE_ENV=development
```

---

## 🏃 Running the Application

Development (auto-reload):

```bash
npm run dev
```

Production:

```bash
npm start
```

---

## 🔐 Authentication

All protected endpoints require the Authorization header:

```
Authorization: Bearer <JWT_TOKEN>
```

Tokens are issued on successful login and expire in 1 hour by default.

---

## API Reference

Base URL: `http://localhost:3000/api`

### Authentication

#### POST /api/users/register
Register a new user.

**Request Body**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "newsPreferences": {
    "categories": ["technology","business"],
    "country": "us",
    "language": "en"
  }
}
```

**Success Response (201)**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "newsPreferences": { "categories": ["technology"], "country": "us", "language": "en" }
  }
}
```

**Errors**
- 400: Validation errors, duplicate email, invalid fields

---

#### POST /api/users/login
Authenticate and receive JWT.

**Request Body**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Success Response (200)**
```json
{
  "success": true,
  "token": "<JWT_TOKEN>",
  "user": { "id": "507f...", "name": "John Doe", "email": "john@example.com", "role": "user" }
}
```

**Errors**
- 400: Invalid credentials, missing fields

---

#### PUT /api/users/preferences
Update user's news preferences. **Requires auth**

**Request Headers**
`Authorization: Bearer <JWT_TOKEN>`

**Request Body**
```json
{
  "categories": ["science","health"],
  "country": "in",
  "language": "en"
}
```

**Success Response (200)** returns updated user object.

---

### User Endpoints (convenience)

#### GET /api/users/me
Get current user profile. **Requires auth**

**Response (200)**
```json
{
  "success": true,
  "user": { "_id":"...", "name":"...", "email":"...", "newsPreferences": {...} }
}
```

---

## News Endpoints

_All news endpoints require authentication unless specified._

#### GET /api/news
Fetch news based on the authenticated user's preferences (categories, country, language). Uses cache when available.

**Query Params (optional)**
- `page` (default 1)
- `limit` (default 20)
- `category` (overrides preference)
- `country` (overrides preference)
- `language` (overrides preference)

**Success Response (200)**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "totalResults": 20,
    "articles": [ /* article objects */ ],
    "fromCache": true,
    "preferences": { "categories":["technology"], "country":"us", "language":"en" }
  }
}
```

---

#### GET /api/news/search/:keyword
Search news for a keyword. **Requires auth**

**URL Parameters**
- `keyword`: search term

**Query Params (optional)** `page`, `limit`, `from`, `to`

**Success Response (200)**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "query": "keyword",
    "totalResults": 10,
    "articles": [...],
    "fromCache": false
  }
}
```

---

#### GET /api/news/:id
Get a single cached news article by its `_id`. **Requires auth**

**Response (200)**
Article object from `News` collection.

---

## User News Actions (Read / Favorite)

These endpoints operate on user-level state and use article `url` as the unique key for `UserNews`.

#### POST /api/news/:id/read
Mark an article as read for the authenticated user.

**Headers**
`Authorization: Bearer <JWT_TOKEN>`

**Body**
```json
{
  "url": "https://example.com/article",
  "title": "Article Title",
  "source": "Example Source",
  "image": "https://example.com/image.jpg"
}
```

**Responses**
- 200: article marked as read (returns the `UserNews` entry)
- 400: missing `url`
- 404: News article (by :id) not found
- 500: internal server error

---

#### POST /api/news/:id/favorite
Mark an article as favorite.

**Body** same as for `/read`.

**Responses**
- 200: article marked as favorite
- 400/404/500 similar behavior

---

#### DELETE /api/news/:id/favorite
Remove article from favorites for the user.

**Body**
```json
{ "url": "https://example.com/article" }
```

**Responses**
- 200: removed (or updated `isFavorite: false`)
- 400: missing url

---

#### GET /api/news/read
Get paginated list of read articles for the user.

**Query**
- `page`, `limit`

**Response**
```json
{
  "success": true,
  "data": {
    "articles": [ /* userNews objects */ ],
    "pagination": { "currentPage":1, "totalPages":2, "totalArticles":10 }
  }
}
```

---

#### GET /api/news/favorites
Get paginated list of favorite articles for the user.

**Query**
- `page`, `limit`

**Response** same structure as `/read`.

---

## Error Handling

Standardized error responses:

- **400 Bad Request**
  ```json
  { "success": false, "message": "Invalid request data" }
  ```
- **401 Unauthorized**
  ```json
  { "success": false, "message": "No token provided" }
  ```
- **403 Forbidden**
  ```json
  { "success": false, "message": "Access denied" }
  ```
- **404 Not Found**
  ```json
  { "success": false, "message": "Not found" }
  ```
- **500 Internal Server Error**
  ```json
  { "success": false, "message": "Internal server error" }
  ```

---

## 🧪 Testing

Install dev deps:
```bash
npm install --save-dev jest supertest
```

Add scripts to `package.json`:
```json
"scripts": {
  "test": "NODE_ENV=test jest --runInBand --detectOpenHandles",
  "test:watch": "jest --watchAll",
  "test:coverage": "jest --coverage",
  "dev": "nodemon app.js",
  "start": "node app.js"
}
```

Run tests:
```bash
npm test
```

**Notes**
- Tests expect `MONGODB_URI_TEST` or fallback to `MONGODB_URI`.
- Ensure `app.js` exports the `app` (Express instance) and does not start the server when `NODE_ENV==='test'`.

---

## 📁 Project Structure

```
news-aggregator-api-Amoghk3/
├── app.js                      # Main application entry point
├── package.json                # Dependencies and scripts
├── .env                        # Environment variables (not in git)
├── .env.sample                 # Environment template
├── .gitignore                  # Git ignore rules
├── README.md                   # This file
├── seedData.js                 # Database seeding script
│
├── controllers/                # Business logic
│   ├── newsController.js       # News fetching logic
│   ├── usersController.js      # User management logic
│   └── userNewsController.js   # Read/favorite logic
│
├── models/                     # Database schemas
│   ├── newsModel.js            # News cache schema
│   ├── usersModel.js           # User schema
│   └── userNewsModel.js        # User-article relationship
│
├── routes/                     # API route definitions
│   ├── newsRoute.js            # News endpoints
│   └── usersRoute.js           # User endpoints
│
├── middleware/                 # Custom middleware
│   ├── authMiddleware.js       # JWT authentication
│   └── loggerMiddleware.js     # Request logging
│
├── services/                   # Background services
│   └── cacheUpdateService.js   # Periodic cache updates
│
├── utils/                      # Helper functions
│   ├── validators.js           # Input validation
│   └── cache.js                # Caching utilities
│
└── test/                       # Test files
    └── server.test.js 
```

---

## 🔄 Caching System

- Cache results stored in `News` collection with `fetchedAt` and `expiresAt`.
- TTL index automatically removes expired docs.
- `cacheUpdateService.js` refreshes cache on a schedule.
- `fromCache` flag indicates whether response was served from DB cache.

---

## 🧾 License

This project is licensed under the **ISC License**.

---

## 👤 Author

**Amogh K Sharma**

---

## 🙏 Acknowledgments

- NewsAPI.org  
- MongoDB   
- JWT (jsonwebtoken)
