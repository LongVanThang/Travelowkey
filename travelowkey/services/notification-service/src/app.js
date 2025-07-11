const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const prometheusMiddleware = require('express-prometheus-middleware');
const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');

// Import configurations and services
const logger = require('./utils/logger');
const { connectDatabase } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { initializeKafka } = require('./config/kafka');
const { initializeProviders } = require('./config/providers');

// Import services
const NotificationService = require('./services/NotificationService');
const TemplateService = require('./services/TemplateService');
const DeliveryService = require('./services/DeliveryService');
const AnalyticsService = require('./services/AnalyticsService');
const PreferenceService = require('./services/PreferenceService');

// Import controllers
const NotificationController = require('./controllers/NotificationController');
const TemplateController = require('./controllers/TemplateController');
const PreferenceController = require('./controllers/PreferenceController');
const AnalyticsController = require('./controllers/AnalyticsController');
const WebhookController = require('./controllers/WebhookController');

// Import middleware
const { authenticate } = require('./middleware/auth');
const { validateNotification } = require('./middleware/validation');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Basic middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Prometheus metrics
app.use(prometheusMiddleware({
  metricsPath: '/metrics',
  collectDefaultMetrics: true,
  requestDurationBuckets: [0.1, 0.5, 1, 2, 5],
}));

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Travelowkey Notification Service API',
      version: '1.0.0',
      description: 'Multi-channel notification service with template management and delivery tracking',
      contact: {
        name: 'Travelowkey Team',
        email: 'api@travelowkey.com',
      },
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3009',
        description: 'Notification Service API',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'notification-service',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Readiness check endpoint
app.get('/ready', async (req, res) => {
  try {
    // Check database connectivity
    // Check Redis connectivity
    // Check external service connectivity
    
    res.status(200).json({
      status: 'ready',
      checks: {
        database: 'connected',
        redis: 'connected',
        kafka: 'connected',
        providers: 'initialized'
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'not ready',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Initialize services
let notificationService;
let templateService;
let deliveryService;
let analyticsService;
let preferenceService;

async function initializeServices() {
  try {
    // Initialize core services
    notificationService = new NotificationService();
    templateService = new TemplateService();
    deliveryService = new DeliveryService();
    analyticsService = new AnalyticsService();
    preferenceService = new PreferenceService();

    // Initialize controllers with services
    const notificationController = new NotificationController(notificationService, templateService, deliveryService);
    const templateController = new TemplateController(templateService);
    const preferenceController = new PreferenceController(preferenceService);
    const analyticsController = new AnalyticsController(analyticsService);
    const webhookController = new WebhookController(notificationService, deliveryService);

    // Setup routes
    app.use('/api/v1/notifications', require('./routes/notifications')(notificationController));
    app.use('/api/v1/templates', require('./routes/templates')(templateController));
    app.use('/api/v1/preferences', require('./routes/preferences')(preferenceController));
    app.use('/api/v1/analytics', require('./routes/analytics')(analyticsController));
    app.use('/api/v1/webhooks', require('./routes/webhooks')(webhookController));

    logger.info('Services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    throw error;
  }
}

// API Routes with authentication
app.use('/api/v1/notifications', authenticate);
app.use('/api/v1/templates', authenticate);
app.use('/api/v1/preferences', authenticate);
app.use('/api/v1/analytics', authenticate);

// Public webhook routes (no auth required)
app.use('/api/v1/webhooks');

// Notification processing endpoint
app.post('/api/v1/send', authenticate, validateNotification, async (req, res) => {
  try {
    const {
      type,
      channel,
      recipients,
      template,
      data,
      options = {}
    } = req.body;

    const requestId = uuidv4();
    
    logger.info('Processing notification request', {
      requestId,
      type,
      channel,
      recipientCount: recipients.length,
      template: template?.name || 'inline'
    });

    // Process notification
    const result = await notificationService.send({
      requestId,
      type,
      channel,
      recipients,
      template,
      data,
      options,
      userId: req.user.id,
      metadata: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date()
      }
    });

    res.status(200).json({
      success: true,
      requestId,
      notificationId: result.notificationId,
      status: result.status,
      recipientCount: result.recipientCount,
      estimatedDelivery: result.estimatedDelivery,
      message: 'Notification queued for processing'
    });

  } catch (error) {
    logger.error('Notification processing failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code || 'NOTIFICATION_ERROR'
    });
  }
});

// Bulk notification endpoint
app.post('/api/v1/send/bulk', authenticate, async (req, res) => {
  try {
    const { notifications } = req.body;
    const batchId = uuidv4();
    
    logger.info('Processing bulk notification request', {
      batchId,
      count: notifications.length
    });

    const results = await notificationService.sendBulk({
      batchId,
      notifications,
      userId: req.user.id,
      metadata: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date()
      }
    });

    res.status(200).json({
      success: true,
      batchId,
      results,
      summary: {
        total: notifications.length,
        queued: results.filter(r => r.status === 'queued').length,
        failed: results.filter(r => r.status === 'failed').length
      }
    });

  } catch (error) {
    logger.error('Bulk notification processing failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code || 'BULK_NOTIFICATION_ERROR'
    });
  }
});

// Notification status endpoint
app.get('/api/v1/notifications/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const status = await notificationService.getStatus(id);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
        code: 'NOTIFICATION_NOT_FOUND'
      });
    }

    res.status(200).json({
      success: true,
      notification: status
    });

  } catch (error) {
    logger.error('Failed to get notification status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'STATUS_ERROR'
    });
  }
});

// Template preview endpoint
app.post('/api/v1/templates/preview', authenticate, async (req, res) => {
  try {
    const { template, data } = req.body;
    
    const preview = await templateService.preview(template, data);
    
    res.status(200).json({
      success: true,
      preview
    });

  } catch (error) {
    logger.error('Template preview failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'TEMPLATE_PREVIEW_ERROR'
    });
  }
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    method: req.method
  });
});

// Scheduled tasks
function setupScheduledTasks() {
  // Process delivery reports every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      logger.info('Processing delivery reports...');
      await deliveryService.processDeliveryReports();
    } catch (error) {
      logger.error('Failed to process delivery reports:', error);
    }
  });

  // Retry failed notifications every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    try {
      logger.info('Retrying failed notifications...');
      await notificationService.retryFailedNotifications();
    } catch (error) {
      logger.error('Failed to retry notifications:', error);
    }
  });

  // Generate analytics reports every hour
  cron.schedule('0 * * * *', async () => {
    try {
      logger.info('Generating analytics reports...');
      await analyticsService.generateHourlyReport();
    } catch (error) {
      logger.error('Failed to generate analytics:', error);
    }
  });

  // Clean up old notifications daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      logger.info('Cleaning up old notifications...');
      await notificationService.cleanupOldNotifications();
    } catch (error) {
      logger.error('Failed to cleanup notifications:', error);
    }
  });

  // Update template performance metrics every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    try {
      logger.info('Updating template metrics...');
      await templateService.updatePerformanceMetrics();
    } catch (error) {
      logger.error('Failed to update template metrics:', error);
    }
  });

  logger.info('Scheduled tasks configured successfully');
}

// Initialize application
async function startServer() {
  try {
    // Connect to databases
    await connectDatabase();
    await connectRedis();
    
    // Initialize Kafka
    await initializeKafka();
    
    // Initialize notification providers
    await initializeProviders();
    
    // Initialize services
    await initializeServices();
    
    // Setup scheduled tasks
    setupScheduledTasks();
    
    const PORT = process.env.PORT || 3009;
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Notification Service running on port ${PORT}`);
      logger.info(`📖 API Documentation: http://localhost:${PORT}/api-docs`);
      logger.info(`💚 Health Check: http://localhost:${PORT}/health`);
      logger.info(`🎯 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
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