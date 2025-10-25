const bcrypt = require('bcrypt');
const usersModel = require('../models/usersModel');
const { validateEmail, validatePassword, validateNewsPreferences, sanitizeInput } = require('../utils/validators');

const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS) || 10;

const registerUser = async (user) => {
  // Sanitize inputs
  user.email = sanitizeInput(user.email);
  user.name = sanitizeInput(user.name);

  // Validate email
  if (!validateEmail(user.email)) {
    throw new Error('Invalid email format');
  }

  // Validate password
  const passwordValidation = validatePassword(user.password);
  if (!passwordValidation.valid) {
    throw new Error(passwordValidation.message);
  }

  // Validate name
  if (!user.name || user.name.length < 2) {
    throw new Error('Name must be at least 2 characters long');
  }

  // Validate news preferences if provided
  if (user.newsPreferences) {
    const preferencesValidation = validateNewsPreferences(user.newsPreferences);
    if (!preferencesValidation.valid) {
      throw new Error(preferencesValidation.errors.join(', '));
    }
  }

  // Check if user already exists
  const existingUser = await usersModel.findOne({ email: user.email });
  if (existingUser) {
    throw new Error('User already exists with this email');
  }

  // Hash password
  const startTime = Date.now();
  user.password = await bcrypt.hash(user.password, SALT_ROUNDS);
  console.log("Hash Computation time:", Date.now() - startTime, "ms");
  
  const dbUser = await usersModel.create(user);
  
  // Remove password from response
  const userResponse = dbUser.toObject();
  delete userResponse.password;
  
  return userResponse;
};

const loginUser = async (email, password) => {
  // Sanitize and validate
  email = sanitizeInput(email);

  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  if (!validateEmail(email)) {
    throw new Error('Invalid email format');
  }

  const dbUser = await usersModel.findOne({ email });
  
  if (!dbUser) {
    throw new Error("Invalid email or password");
  }
  
  const isSamePassword = await bcrypt.compare(password, dbUser.password);
  if (!isSamePassword) {
    console.log("Invalid password attempt for:", email);
    throw new Error("Invalid email or password");
  }
  
  // Remove password before returning
  const userResponse = dbUser.toObject();
  delete userResponse.password;
  
  return userResponse;
};

const updateUserPreferences = async (userId, preferences) => {
  // Validate preferences
  const validation = validateNewsPreferences(preferences);
  if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
  }

  const user = await usersModel.findById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }

  user.newsPreferences = {
    ...user.newsPreferences.toObject(),
    ...preferences
  };

  await user.save();

  const userResponse = user.toObject();
  delete userResponse.password;
  
  return userResponse;
};

module.exports = { 
  registerUser, 
  loginUser, 
  updateUserPreferences 
};