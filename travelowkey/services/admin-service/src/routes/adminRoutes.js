// adminRoutes.js - Route definitions for admin endpoints

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateAdmin } = require('../middleware/auth');

// Example admin routes
router.get('/dashboard', authenticateAdmin, adminController.getDashboard);
router.post('/users', authenticateAdmin, adminController.createUser);
// ... add more routes as needed

module.exports = router;