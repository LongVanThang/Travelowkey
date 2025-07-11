// app.js - Minimal Express app setup for payment-service

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(morgan('dev'));

// Mount payment routes
app.use('/api/v1/payments', paymentRoutes);

// Default route
app.get('/', (req, res) => {
  res.json({
    service: 'Payment Service',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      payments: '/api/v1/payments'
    }
  });
});

module.exports = app;