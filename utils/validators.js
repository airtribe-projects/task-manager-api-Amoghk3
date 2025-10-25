const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  if (!password || password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long' };
  }
  if (password.length > 100) {
    return { valid: false, message: 'Password cannot exceed 100 characters' };
  }
  return { valid: true };
};

const validateNewsPreferences = (preferences) => {
  const validCategories = ['business', 'entertainment', 'general', 'health', 'science', 'sports', 'technology'];
  const errors = [];

  if (preferences.categories) {
    if (!Array.isArray(preferences.categories)) {
      errors.push('Categories must be an array');
    } else {
      const invalidCategories = preferences.categories.filter(cat => !validCategories.includes(cat));
      if (invalidCategories.length > 0) {
        errors.push(`Invalid categories: ${invalidCategories.join(', ')}. Valid options: ${validCategories.join(', ')}`);
      }
    }
  }

  if (preferences.country) {
    if (typeof preferences.country !== 'string' || preferences.country.length !== 2) {
      errors.push('Country must be a 2-letter code (e.g., us, in, gb)');
    }
  }

  if (preferences.language) {
    if (typeof preferences.language !== 'string' || preferences.language.length !== 2) {
      errors.push('Language must be a 2-letter code (e.g., en, es, fr)');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input.trim();
  }
  return input;
};

module.exports = {
  validateEmail,
  validatePassword,
  validateNewsPreferences,
  sanitizeInput
};