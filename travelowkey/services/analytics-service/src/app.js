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
const { createServer } = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

// Import configurations and services
const logger = require('./utils/logger');
const { connectClickHouse } = require('./config/clickhouse');
const { connectInfluxDB } = require('./config/influxdb');
const { connectMongoDB } = require('./config/mongodb');
const { connectRedis } = require('./config/redis');
const { initializeKafka } = require('./config/kafka');

// Import services
const AnalyticsService = require('./services/AnalyticsService');
const RealtimeAnalyticsService = require('./services/RealtimeAnalyticsService');
const BusinessIntelligenceService = require('./services/BusinessIntelligenceService');
const DataWarehouseService = require('./services/DataWarehouseService');
const PredictiveAnalyticsService = require('./services/PredictiveAnalyticsService');
const ReportingService = require('./services/ReportingService');
const DashboardService = require('./services/DashboardService');
const MLModelService = require('./services/MLModelService');

// Import controllers
const AnalyticsController = require('./controllers/AnalyticsController');
const DashboardController = require('./controllers/DashboardController');
const ReportsController = require('./controllers/ReportsController');
const KPIController = require('./controllers/KPIController');
const PredictionsController = require('./controllers/PredictionsController');
const MetricsController = require('./controllers/MetricsController');

// Import middleware
const { authenticate, authorize } = require('./middleware/auth');
const { validateQuery } = require('./middleware/validation');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const server = createServer(app);

// Socket.IO for real-time analytics
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'", "https:", "data:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Analytics-Context'],
}));

// Basic middleware
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging with analytics tracking
app.use(morgan('combined', {
  stream: { 
    write: (message) => {
      logger.info(message.trim());
      // Send to analytics pipeline
    }
  }
}));

// Enhanced rate limiting for analytics endpoints
const analyticsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Higher limit for analytics queries
  message: {
    error: 'Too many analytics requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip; // Rate limit per user or IP
  }
});

const dashboardLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Dashboard updates
  message: 'Dashboard update rate limit exceeded'
});

// Prometheus metrics with custom analytics metrics
app.use(prometheusMiddleware({
  metricsPath: '/metrics',
  collectDefaultMetrics: true,
  requestDurationBuckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  customMetrics: {
    analytics_queries_total: {
      type: 'counter',
      help: 'Total number of analytics queries processed'
    },
    analytics_query_duration: {
      type: 'histogram',
      help: 'Duration of analytics queries',
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
    },
    ml_predictions_total: {
      type: 'counter', 
      help: 'Total number of ML predictions made'
    },
    dashboard_connections: {
      type: 'gauge',
      help: 'Number of active dashboard connections'
    }
  }
}));

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Travelowkey Analytics Service API',
      version: '1.0.0',
      description: 'Advanced Analytics and Business Intelligence Service with real-time dashboards and ML predictions',
      contact: {
        name: 'Travelowkey Analytics Team',
        email: 'analytics@travelowkey.com',
      },
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3011',
        description: 'Analytics Service API',
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
      schemas: {
        AnalyticsQuery: {
          type: 'object',
          properties: {
            metric: { type: 'string', description: 'Metric to analyze' },
            dimensions: { type: 'array', items: { type: 'string' } },
            filters: { type: 'object' },
            timeRange: { 
              type: 'object',
              properties: {
                start: { type: 'string', format: 'date-time' },
                end: { type: 'string', format: 'date-time' }
              }
            },
            aggregation: { type: 'string', enum: ['sum', 'avg', 'count', 'min', 'max'] }
          }
        },
        DashboardConfig: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            widgets: { type: 'array' },
            layout: { type: 'object' },
            refreshInterval: { type: 'number' },
            permissions: { type: 'array' }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint with detailed analytics health
app.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      service: 'analytics-service',
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      components: {
        clickhouse: 'connected',
        influxdb: 'connected',
        mongodb: 'connected',
        redis: 'connected',
        kafka: 'connected',
        ml_models: 'loaded'
      },
      performance: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        activeConnections: io.engine.clientsCount,
        queuedQueries: await getQueuedQueriesCount()
      }
    };

    res.status(200).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Initialize services
let analyticsService;
let realtimeAnalyticsService;
let businessIntelligenceService;
let dataWarehouseService;
let predictiveAnalyticsService;
let reportingService;
let dashboardService;
let mlModelService;

async function initializeServices() {
  try {
    logger.info('Initializing analytics services...');

    // Initialize core services
    analyticsService = new AnalyticsService();
    realtimeAnalyticsService = new RealtimeAnalyticsService(io);
    businessIntelligenceService = new BusinessIntelligenceService();
    dataWarehouseService = new DataWarehouseService();
    predictiveAnalyticsService = new PredictiveAnalyticsService();
    reportingService = new ReportingService();
    dashboardService = new DashboardService(io);
    mlModelService = new MLModelService();

    // Initialize ML models
    await mlModelService.initializeModels();

    // Initialize controllers
    const analyticsController = new AnalyticsController(analyticsService, businessIntelligenceService);
    const dashboardController = new DashboardController(dashboardService, realtimeAnalyticsService);
    const reportsController = new ReportsController(reportingService, businessIntelligenceService);
    const kpiController = new KPIController(analyticsService, businessIntelligenceService);
    const predictionsController = new PredictionsController(predictiveAnalyticsService, mlModelService);
    const metricsController = new MetricsController(analyticsService, dataWarehouseService);

    // Setup routes
    app.use('/api/v1/analytics', analyticsLimiter, require('./routes/analytics')(analyticsController));
    app.use('/api/v1/dashboards', dashboardLimiter, require('./routes/dashboards')(dashboardController));
    app.use('/api/v1/reports', require('./routes/reports')(reportsController));
    app.use('/api/v1/kpis', require('./routes/kpis')(kpiController));
    app.use('/api/v1/predictions', require('./routes/predictions')(predictionsController));
    app.use('/api/v1/metrics', require('./routes/metrics')(metricsController));

    logger.info('Analytics services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize analytics services:', error);
    throw error;
  }
}

// Real-time analytics endpoint
app.post('/api/v1/analytics/realtime', authenticate, validateQuery, async (req, res) => {
  try {
    const query = req.body;
    const queryId = uuidv4();
    
    logger.info('Processing real-time analytics query', {
      queryId,
      metric: query.metric,
      userId: req.user.id
    });

    // Start real-time query processing
    const stream = await realtimeAnalyticsService.executeQuery({
      ...query,
      queryId,
      userId: req.user.id
    });

    // Send immediate response with query ID
    res.status(200).json({
      success: true,
      queryId,
      status: 'processing',
      message: 'Real-time query initiated',
      websocketChannel: `analytics:${queryId}`
    });

    // Process results via WebSocket
    stream.on('data', (data) => {
      io.to(`user:${req.user.id}`).emit('analytics:data', {
        queryId,
        data,
        timestamp: new Date()
      });
    });

    stream.on('complete', (summary) => {
      io.to(`user:${req.user.id}`).emit('analytics:complete', {
        queryId,
        summary,
        timestamp: new Date()
      });
    });

  } catch (error) {
    logger.error('Real-time analytics query failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'REALTIME_QUERY_ERROR'
    });
  }
});

// Batch analytics endpoint
app.post('/api/v1/analytics/batch', authenticate, validateQuery, async (req, res) => {
  try {
    const { queries } = req.body;
    const batchId = uuidv4();
    
    logger.info('Processing batch analytics queries', {
      batchId,
      queryCount: queries.length,
      userId: req.user.id
    });

    const results = await analyticsService.executeBatch({
      batchId,
      queries,
      userId: req.user.id,
      parallel: req.body.parallel !== false
    });

    res.status(200).json({
      success: true,
      batchId,
      results,
      summary: {
        total: queries.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        executionTime: results.reduce((sum, r) => sum + (r.executionTime || 0), 0)
      }
    });

  } catch (error) {
    logger.error('Batch analytics processing failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'BATCH_ANALYTICS_ERROR'
    });
  }
});

// KPI dashboard endpoint
app.get('/api/v1/kpis/dashboard', authenticate, async (req, res) => {
  try {
    const timeRange = {
      start: req.query.start || new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: req.query.end || new Date()
    };

    const kpis = await businessIntelligenceService.getKPIDashboard({
      timeRange,
      userId: req.user.id,
      filters: req.query
    });

    res.status(200).json({
      success: true,
      kpis,
      timeRange,
      lastUpdated: new Date()
    });

  } catch (error) {
    logger.error('KPI dashboard fetch failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'KPI_DASHBOARD_ERROR'
    });
  }
});

// Predictive analytics endpoint
app.post('/api/v1/predictions/demand', authenticate, async (req, res) => {
  try {
    const { 
      destination,
      timeframe,
      features = {},
      modelType = 'demand_forecast'
    } = req.body;

    const prediction = await predictiveAnalyticsService.predictDemand({
      destination,
      timeframe,
      features,
      modelType,
      userId: req.user.id
    });

    res.status(200).json({
      success: true,
      prediction,
      model: {
        type: modelType,
        accuracy: prediction.modelAccuracy,
        lastTrained: prediction.modelLastTrained
      },
      metadata: {
        generatedAt: new Date(),
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });

  } catch (error) {
    logger.error('Demand prediction failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'PREDICTION_ERROR'
    });
  }
});

// Export analytics data
app.post('/api/v1/export', authenticate, async (req, res) => {
  try {
    const {
      query,
      format = 'csv',
      filename
    } = req.body;

    const exportId = uuidv4();
    
    logger.info('Starting data export', {
      exportId,
      format,
      userId: req.user.id
    });

    // Queue export job
    const job = await reportingService.queueExport({
      exportId,
      query,
      format,
      filename,
      userId: req.user.id
    });

    res.status(202).json({
      success: true,
      exportId,
      status: 'queued',
      jobId: job.id,
      estimatedCompletion: job.estimatedCompletion,
      downloadUrl: `/api/v1/exports/${exportId}/download`
    });

  } catch (error) {
    logger.error('Export initiation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'EXPORT_ERROR'
    });
  }
});

// WebSocket authentication and connection handling
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      throw new Error('No authentication token provided');
    }

    // Verify JWT token
    const user = await verifyToken(token);
    socket.userId = user.id;
    socket.user = user;
    
    next();
  } catch (error) {
    logger.error('WebSocket authentication failed:', error);
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  logger.info('Analytics WebSocket connected', { 
    userId: socket.userId,
    socketId: socket.id 
  });

  // Join user-specific room
  socket.join(`user:${socket.userId}`);

  // Handle dashboard subscriptions
  socket.on('subscribe:dashboard', async (dashboardId) => {
    try {
      // Verify user has access to dashboard
      const hasAccess = await dashboardService.verifyAccess(dashboardId, socket.userId);
      if (!hasAccess) {
        socket.emit('error', { message: 'Access denied to dashboard' });
        return;
      }

      socket.join(`dashboard:${dashboardId}`);
      socket.emit('subscribed', { dashboardId });
      
      // Send initial dashboard data
      const dashboardData = await dashboardService.getDashboardData(dashboardId);
      socket.emit('dashboard:data', dashboardData);
      
    } catch (error) {
      logger.error('Dashboard subscription failed:', error);
      socket.emit('error', { message: 'Failed to subscribe to dashboard' });
    }
  });

  // Handle real-time query subscriptions
  socket.on('subscribe:query', async (queryConfig) => {
    try {
      const queryId = uuidv4();
      const stream = await realtimeAnalyticsService.subscribeToQuery({
        ...queryConfig,
        queryId,
        userId: socket.userId
      });

      socket.join(`query:${queryId}`);
      
      stream.on('data', (data) => {
        socket.emit('query:data', { queryId, data });
      });

      socket.emit('query:subscribed', { queryId });
      
    } catch (error) {
      logger.error('Query subscription failed:', error);
      socket.emit('error', { message: 'Failed to subscribe to query' });
    }
  });

  socket.on('disconnect', () => {
    logger.info('Analytics WebSocket disconnected', { 
      userId: socket.userId,
      socketId: socket.id 
    });
  });
});

// Scheduled tasks for analytics
function setupScheduledTasks() {
  // Update real-time dashboards every 30 seconds
  cron.schedule('*/30 * * * * *', async () => {
    try {
      await dashboardService.updateRealTimeDashboards();
    } catch (error) {
      logger.error('Failed to update real-time dashboards:', error);
    }
  });

  // Process analytics aggregations every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      await analyticsService.processAggregations();
    } catch (error) {
      logger.error('Failed to process aggregations:', error);
    }
  });

  // Update ML models every hour
  cron.schedule('0 * * * *', async () => {
    try {
      await mlModelService.updateModels();
    } catch (error) {
      logger.error('Failed to update ML models:', error);
    }
  });

  // Generate daily reports at 6 AM
  cron.schedule('0 6 * * *', async () => {
    try {
      await reportingService.generateDailyReports();
    } catch (error) {
      logger.error('Failed to generate daily reports:', error);
    }
  });

  // Archive old data weekly
  cron.schedule('0 2 * * 0', async () => {
    try {
      await dataWarehouseService.archiveOldData();
    } catch (error) {
      logger.error('Failed to archive old data:', error);
    }
  });

  logger.info('Analytics scheduled tasks configured');
}

// Helper functions
async function getQueuedQueriesCount() {
  try {
    return await analyticsService.getQueuedQueriesCount();
  } catch (error) {
    return 0;
  }
}

async function verifyToken(token) {
  // Implementation would verify JWT token
  // For now, return mock user
  return { id: 'user123', role: 'admin' };
}

// Apply authentication to all analytics routes
app.use('/api/v1/analytics', authenticate);
app.use('/api/v1/dashboards', authenticate);
app.use('/api/v1/reports', authenticate);
app.use('/api/v1/kpis', authenticate);
app.use('/api/v1/predictions', authenticate);
app.use('/api/v1/metrics', authenticate);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Analytics endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    method: req.method
  });
});

// Initialize application
async function startServer() {
  try {
    // Connect to databases
    await connectClickHouse();
    await connectInfluxDB();
    await connectMongoDB();
    await connectRedis();
    
    // Initialize Kafka
    await initializeKafka();
    
    // Initialize services
    await initializeServices();
    
    // Setup scheduled tasks
    setupScheduledTasks();
    
    const PORT = process.env.PORT || 3011;
    server.listen(PORT, () => {
      logger.info(`🚀 Analytics Service running on port ${PORT}`);
      logger.info(`📊 API Documentation: http://localhost:${PORT}/api-docs`);
      logger.info(`💚 Health Check: http://localhost:${PORT}/health`);
      logger.info(`🔌 WebSocket Analytics: ws://localhost:${PORT}`);
      logger.info(`🎯 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down analytics service gracefully');
      server.close(() => {
        logger.info('Analytics service terminated');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start analytics service:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = { app, server, io };