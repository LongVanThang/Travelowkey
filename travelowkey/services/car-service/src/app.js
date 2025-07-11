const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const schedule = require('node-schedule');
require('express-async-errors');
require('dotenv').config();

const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');
const { connectRedis } = require('./config/redis');
const { connectKafka } = require('./config/kafka');
const FleetManagerService = require('./services/FleetManagerService');

// Import routes
const carRoutes = require('./routes/carRoutes');
const fleetRoutes = require('./routes/fleetRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const locationRoutes = require('./routes/locationRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const healthRoutes = require('./routes/healthRoutes');

const app = express();
const PORT = process.env.PORT || 3003;

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
app.use('/api/cars', authMiddleware);
app.use('/api/fleet', authMiddleware);
app.use('/api/bookings', authMiddleware);
app.use('/api/locations', authMiddleware);
app.use('/api/maintenance', authMiddleware);

// Routes
app.use('/api/cars', carRoutes);
app.use('/api/fleet', fleetRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/maintenance', maintenanceRoutes);

// Default route
app.get('/', (req, res) => {
  res.json({
    service: 'Car Rental Service',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      documentation: '/api/docs',
      cars: '/api/cars',
      fleet: '/api/fleet',
      bookings: '/api/bookings',
      locations: '/api/locations',
      maintenance: '/api/maintenance'
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
      'GET /api/cars',
      'GET /api/fleet',
      'GET /api/bookings',
      'GET /api/locations',
      'GET /api/maintenance'
    ]
  });
});

// Initialize background services
let fleetManagerService;

// Scheduled tasks
function initializeScheduledTasks() {
  // Fleet status update every 5 minutes
  schedule.scheduleJob('*/5 * * * *', async () => {
    try {
      await fleetManagerService.updateFleetStatus();
      logger.info('Fleet status updated successfully');
    } catch (error) {
      logger.error('Failed to update fleet status:', error);
    }
  });

  // Daily maintenance check at 3:00 AM
  schedule.scheduleJob('0 3 * * *', async () => {
    try {
      await fleetManagerService.checkMaintenanceSchedule();
      logger.info('Daily maintenance check completed');
    } catch (error) {
      logger.error('Failed to check maintenance schedule:', error);
    }
  });

  // Booking expiry check every 30 minutes
  schedule.scheduleJob('*/30 * * * *', async () => {
    try {
      await fleetManagerService.processExpiredBookings();
      logger.info('Expired bookings processed');
    } catch (error) {
      logger.error('Failed to process expired bookings:', error);
    }
  });

  logger.info('Scheduled tasks initialized');
}

// Initialize connections and start server
async function startServer() {
  try {
    // Connect to external services
    await connectRedis();
    await connectKafka();

    // Initialize fleet manager service
    fleetManagerService = new FleetManagerService();
    await fleetManagerService.initialize();

    // Initialize scheduled tasks
    initializeScheduledTasks();

    // Start HTTP server
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Car Service started successfully on port ${PORT}`);
      logger.info(`API Documentation available at http://localhost:${PORT}/api/docs`);
      logger.info(`Health check available at http://localhost:${PORT}/api/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      
      // Cancel all scheduled jobs
      schedule.gracefulShutdown();
      
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      
      // Cancel all scheduled jobs
      schedule.gracefulShutdown();
      
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