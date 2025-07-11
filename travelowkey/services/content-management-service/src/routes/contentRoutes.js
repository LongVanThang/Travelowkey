// contentRoutes.js - Route definitions for content endpoints

const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');

// Example content routes
router.post('/', contentController.createContent);
// ... add more routes as needed

module.exports = router;