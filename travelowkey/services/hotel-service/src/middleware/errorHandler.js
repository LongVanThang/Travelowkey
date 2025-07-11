const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log the error
  logger.error('Error details:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });

  // Elasticsearch errors
  if (err.name === 'ResponseError') {
    const message = 'Database operation failed';
    error = {
      message,
      statusCode: 500
    };
  }

  // Redis errors
  if (err.code === 'ECONNREFUSED' && err.address) {
    const message = 'Cache service unavailable';
    error = {
      message,
      statusCode: 503
    };
  }

  // Kafka errors
  if (err.name === 'KafkaJSError') {
    const message = 'Message queue operation failed';
    error = {
      message,
      statusCode: 503
    };
  }

  // Validation errors (from express-validator or Joi)
  if (err.name === 'ValidationError' || err.isJoi) {
    const message = 'Validation failed';
    const details = err.details || err.errors;
    return res.status(400).json({
      error: message,
      details: details,
      statusCode: 400,
      timestamp: new Date().toISOString()
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    return res.status(401).json({
      error: message,
      statusCode: 401,
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    return res.status(401).json({
      error: message,
      statusCode: 401,
      timestamp: new Date().toISOString()
    });
  }

  // Mongoose/MongoDB errors
  if (err.name === 'CastError') {
    const message = 'Invalid resource ID';
    error = {
      message,
      statusCode: 400
    };
  }

  if (err.code === 11000) {
    const message = 'Duplicate resource';
    error = {
      message,
      statusCode: 400
    };
  }

  // Rate limiting errors
  if (err.type === 'entity.too.large') {
    const message = 'Request entity too large';
    error = {
      message,
      statusCode: 413
    };
  }

  // Default to 500 server error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  // Don't send stack trace in production
  const errorResponse = {
    error: message,
    statusCode,
    timestamp: new Date().toISOString()
  };

  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  // Send different responses based on environment
  if (process.env.NODE_ENV === 'production') {
    // Don't leak error details in production
    if (statusCode === 500) {
      errorResponse.error = 'Something went wrong';
    }
  }

  res.status(statusCode).json(errorResponse);
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled Promise Rejection:', {
    error: err.message,
    stack: err.stack,
    promise: promise
  });
  
  // Close server gracefully
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', {
    error: err.message,
    stack: err.stack
  });
  
  // Close server gracefully
  process.exit(1);
});

module.exports = errorHandler;