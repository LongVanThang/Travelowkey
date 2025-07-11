// analyticsRoutes.js - Route definitions for analytics endpoints

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// Example analytics routes
router.get('/dashboard', analyticsController.getDashboard);
// ... add more routes as needed

module.exports = router;