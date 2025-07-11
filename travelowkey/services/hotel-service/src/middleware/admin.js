const logger = require('../utils/logger');

const adminMiddleware = (req, res, next) => {
  try {
    // Check if user is authenticated (auth middleware should run first)
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be authenticated to access this resource'
      });
    }

    // Define admin roles
    const adminRoles = [
      'ADMIN',
      'SUPER_ADMIN',
      'HOTEL_MANAGER',
      'CONTENT_MODERATOR'
    ];

    // Check if user has admin role
    if (!adminRoles.includes(req.user.role)) {
      logger.warn(`Access denied for user ${req.user.id} with role ${req.user.role}`);
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access this resource'
      });
    }

    // Log admin action
    logger.info(`Admin action by user ${req.user.id} (${req.user.role}): ${req.method} ${req.originalUrl}`);

    next();
  } catch (error) {
    logger.error('Admin authorization error:', error);
    res.status(500).json({
      error: 'Authorization failed',
      message: 'Internal server error during authorization'
    });
  }
};

module.exports = adminMiddleware;