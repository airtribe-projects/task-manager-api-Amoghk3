const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  role: { 
    type: String, 
    default: 'user',
    enum: {
      values: ['user', 'admin'],
      message: '{VALUE} is not a valid role'
    }
  },
  newsPreferences: {
    categories: {
      type: [{ 
        type: String,
        enum: {
          values: ['business', 'entertainment', 'general', 'health', 'science', 'sports', 'technology'],
          message: '{VALUE} is not a valid category'
        }
      }],
      default: ['general']
    },
    country: { 
      type: String, 
      default: 'us',
      maxlength: [2, 'Country code must be 2 characters'],
      validate: {
        validator: function(v) {
          return /^[a-z]{2}$/.test(v);
        },
        message: 'Country must be a valid 2-letter code (e.g., us, in, gb)'
      }
    },
    language: { 
      type: String, 
      default: 'en',
      maxlength: [2, 'Language code must be 2 characters'],
      validate: {
        validator: function(v) {
          return /^[a-z]{2}$/.test(v);
        },
        message: 'Language must be a valid 2-letter code (e.g., en, es, fr)'
      }
    }
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('User', userSchema);