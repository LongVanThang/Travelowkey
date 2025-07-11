// paymentRoutes.js - Route definitions for payment endpoints

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Example payment routes
router.post('/', paymentController.createPayment);
router.get('/:id', paymentController.getPayment);
// ... add more routes as needed

module.exports = router;