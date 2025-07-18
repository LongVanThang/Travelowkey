// errorHandler.js - Centralized error handling middleware

exports.errorHandler = (err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
};