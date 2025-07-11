// app.js - Minimal Express app setup and middleware

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const { errorHandler } = require('./middleware/errorHandler');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Security and basic middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(morgan('dev'));

// Mount admin routes
app.use('/api/v1/admin', adminRoutes);

// Global error handler
app.use(errorHandler);

module.exports = app;