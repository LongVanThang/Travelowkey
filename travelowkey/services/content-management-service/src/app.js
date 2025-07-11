// app.js - Minimal Express app setup for content-management-service

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const contentRoutes = require('./routes/contentRoutes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(morgan('dev'));

// Mount content routes
app.use('/api/v1/content', contentRoutes);

// Default route
app.get('/', (req, res) => {
  res.json({
    service: 'Content Management Service',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      content: '/api/v1/content'
    }
  });
});

module.exports = app;