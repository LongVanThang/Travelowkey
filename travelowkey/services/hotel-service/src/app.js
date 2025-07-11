const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
require('express-async-errors');
require('dotenv').config();

const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');
const { connectElasticsearch } = require('./config/elasticsearch');
const { connectRedis } = require('./config/redis');
const { connectKafka } = require('./config/kafka');

// Import routes
const hotelRoutes = require('./routes/hotelRoutes');
const searchRoutes = require('./routes/searchRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const roomRoutes = require('./routes/roomRoutes');
const amenityRoutes = require('./routes/amenityRoutes');
const healthRoutes = require('./routes/healthRoutes');

const app = express();
const PORT = process.env.PORT || 3002;

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) }
  }));
}

// Apply rate limiting
app.use(limiter);

// API Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check (no auth required)
app.use('/api/health', healthRoutes);

// Apply authentication middleware to protected routes
app.use('/api/hotels', authMiddleware);
app.use('/api/search', authMiddleware);
app.use('/api/inventory', authMiddleware);
app.use('/api/rooms', authMiddleware);
app.use('/api/amenities', authMiddleware);

// --- Security Hardening Enhancements (Phase 6) ---
// NOTE: mTLS is enforced at the infrastructure level (e.g., Istio in Kubernetes)

// RBAC middleware example (add after authMiddleware)
function rbac(roles = []) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}

// Example usage: protect admin routes
// app.use('/api/admin', authMiddleware, rbac(['admin']));

// Ensure input validation (e.g., Joi) is used in all route handlers to prevent XSS/SQLi
// Example:
// const Joi = require('joi');
// router.post('/resource', validate(schema), handler);
//
// function validate(schema) {
//   return (req, res, next) => {
//     const { error } = schema.validate(req.body);
//     if (error) return res.status(400).json({ error: error.details[0].message });
//     next();
//   };
// }

// Routes
app.use('/api/hotels', hotelRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/amenities', amenityRoutes);

// Default route
app.get('/', (req, res) => {
  res.json({
    service: 'Hotel Service',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      documentation: '/api/docs',
      hotels: '/api/hotels',
      search: '/api/search',
      inventory: '/api/inventory',
      rooms: '/api/rooms',
      amenities: '/api/amenities'
    }
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
    availableEndpoints: [
      'GET /',
      'GET /api/health',
      'GET /api/docs',
      'GET /api/hotels',
      'GET /api/search',
      'GET /api/inventory',
      'GET /api/rooms',
      'GET /api/amenities'
    ]
  });
});

// Initialize connections and start server
async function startServer() {
  try {
    // Connect to external services
    await connectElasticsearch();
    await connectRedis();
    await connectKafka();

    // Start HTTP server
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Hotel Service started successfully on port ${PORT}`);
      logger.info(`API Documentation available at http://localhost:${PORT}/api/docs`);
      logger.info(`Health check available at http://localhost:${PORT}/api/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      server.close(() => {
        process.exit(1);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      server.close(() => {
        process.exit(1);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;