-----------------------format----------------------------
```
const User = require('../models/User');

const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return next();
  }
  console.log('Authentication failed: User not logged in');
  res.redirect('/auth/login');
};

const hasRole = (requiredRole) => {
  return async (req, res, next) => {
    if (!req.session.userId) {
      console.log('Authorization failed: User not logged in');
      return res.redirect('/auth/login');
    }
    try {
      const user = await User.findById(req.session.userId);
      if (user && user.role === requiredRole) {
        return next();
      }
      console.log(`Authorization failed: User does not have the required role (${requiredRole})`);
      res.status(403).send('Access denied');
    } catch (error) {
      console.error('Authorization error:', error.message);
      console.error(error.stack);
      res.status(500).send('Internal server error');
    }
  };
};

module.exports = {
  isAuthenticated,
  hasRole,
};
```
------------------------end_of_format---------------------------