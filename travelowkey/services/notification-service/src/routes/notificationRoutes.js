// notificationRoutes.js - Route definitions for notification endpoints

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// Example notification routes
router.post('/', notificationController.sendNotification);
// ... add more routes as needed

module.exports = router;