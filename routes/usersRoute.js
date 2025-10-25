const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const jwt = require('jsonwebtoken');
const validateJWT = require('../middleware/authMiddleware');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const dbUser = await usersController.loginUser(email, password);
    
    const payload = {
      id: dbUser._id,
      name: dbUser.name,
      role: dbUser.role,
      email: dbUser.email
    };
    
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    res.status(200).json({ 
      success: true,
      token,
      user: {
        id: dbUser._id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role
      }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(400).json({ 
      success: false,
      message: err.message 
    });
  }
});

router.post('/register', async (req, res) => {
  const user = req.body;
  
  try {
    const dbUser = await usersController.registerUser(user);
    
    res.status(201).json({ 
      success: true,
      message: 'User registered successfully',
      user: dbUser
    });
  } catch (err) {
    console.error('Registration error:', err.message);
    res.status(400).json({ 
      success: false,
      message: err.message 
    });
  }
});

router.put('/preferences', validateJWT, async (req, res) => {
  try {
    const { categories, country, language } = req.body;
    
    const preferences = {};
    if (categories) preferences.categories = categories;
    if (country) preferences.country = country;
    if (language) preferences.language = language;
    
    const updatedUser = await usersController.updateUserPreferences(
      req.user.id, 
      preferences
    );
    
    res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
      user: updatedUser
    });
  } catch (err) {
    console.error('Update preferences error:', err.message);
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
});

module.exports = router;