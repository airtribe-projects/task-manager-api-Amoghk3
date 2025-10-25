const jwt = require('jsonwebtoken');

const validateJWT = (req, res, next) => {
  try {
    const headers = req.headers || {};
    const authHeader = headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        success: false,
        message: "No token provided. Please login first." 
      });
    }

    // Handle "Bearer TOKEN" format
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid token format" 
      });
    }
    
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decodedToken) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid token" 
      });
    }
    
    console.log("✓ Validated JWT for user:", decodedToken.email);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('JWT validation error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: "Token has expired. Please login again." 
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: "Invalid token. Please login again." 
      });
    }
    
    return res.status(401).json({ 
      success: false,
      message: "Token verification failed" 
    });
  }
};

module.exports = validateJWT;