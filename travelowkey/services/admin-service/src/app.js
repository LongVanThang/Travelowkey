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
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { v4: uuidv4 } = require('uuid');
const passport = require('passport');
const Bull = require('bull');

// Import configurations and services
const logger = require('./utils/logger');
const { connectPostgreSQL } = require('./config/database');
const { connectMongoDB } = require('./config/mongodb');
const { connectRedis } = require('./config/redis');
const { initializeKafka } = require('./config/kafka');
const { connectElasticsearch } = require('./config/elasticsearch');

// Import services
const AdminUserService = require('./services/AdminUserService');
const SystemMonitoringService = require('./services/SystemMonitoringService');
const ServiceManagementService = require('./services/ServiceManagementService');
const UserManagementService = require('./services/UserManagementService');
const BookingManagementService = require('./services/BookingManagementService');
const FinancialManagementService = require('./services/FinancialManagementService');
const ContentModerationService = require('./services/ContentModerationService');
const AnalyticsDashboardService = require('./services/AnalyticsDashboardService');
const ConfigurationService = require('./services/ConfigurationService');
const AuditLogService = require('./services/AuditLogService');
const NotificationCenterService = require('./services/NotificationCenterService');
const BackupService = require('./services/BackupService');
const SecurityService = require('./services/SecurityService');

// Import controllers
const DashboardController = require('./controllers/DashboardController');
const SystemController = require('./controllers/SystemController');
const UsersController = require('./controllers/UsersController');
const BookingsController = require('./controllers/BookingsController');
const FinanceController = require('./controllers/FinanceController');
const ContentController = require('./controllers/ContentController');
const AnalyticsController = require('./controllers/AnalyticsController');
const ConfigController = require('./controllers/ConfigController');
const AuditController = require('./controllers/AuditController');
const ReportsController = require('./controllers/ReportsController');
const SecurityController = require('./controllers/SecurityController');

// Import middleware
const { authenticateAdmin, requireRole, requirePermission } = require('./middleware/auth');
const { auditLog } = require('./middleware/audit');
const { validateInput } = require('./middleware/validation');
const { rateLimitByRole } = require('./middleware/rateLimiting');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const server = createServer(app);

// Socket.IO for real-time admin dashboard
const io = new Server(server, {
  cors: {
    origin: process.env.ADMIN_CORS_ORIGINS?.split(',') || ['http://localhost:3001'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Redis client for sessions and queues
let redisClient;
let sessionStore;

// Job queues for background tasks
const systemMaintenanceQueue = new Bull('system maintenance', {
  redis: { port: 6379, host: 'redis' }
});
const reportGenerationQueue = new Bull('report generation', {
  redis: { port: 6379, host: 'redis' }
});
const backupQueue = new Bull('backup operations', {
  redis: { port: 6379, host: 'redis' }
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
      frameSrc: ["'self'"],
      mediaSrc: ["'self'", "blob:"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration for admin panel
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ADMIN_CORS_ORIGINS?.split(',') || ['http://localhost:3001'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Admin-Context'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
}));

// Basic middleware
app.use(compression());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Session configuration
app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'admin-session-secret-2024',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    sameSite: 'strict'
  },
  name: 'admin.session.id'
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Request logging with admin context
app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms', {
  stream: { 
    write: (message) => {
      logger.info(`[ADMIN] ${message.trim()}`);
    }
  }
}));

// Enhanced rate limiting by admin role
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req) => {
    if (req.user?.role === 'super_admin') return 2000;
    if (req.user?.role === 'admin') return 1000;
    if (req.user?.role === 'moderator') return 500;
    return 100; // Default for unauthenticated
  },
  message: {
    error: 'Too many admin requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `admin:${req.user?.id || req.ip}`;
  }
});

app.use(adminLimiter);

// Prometheus metrics with admin-specific metrics
app.use(prometheusMiddleware({
  metricsPath: '/metrics',
  collectDefaultMetrics: true,
  requestDurationBuckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  customMetrics: {
    admin_actions_total: {
      type: 'counter',
      help: 'Total number of admin actions performed'
    },
    admin_logins_total: {
      type: 'counter',
      help: 'Total number of admin logins'
    },
    system_alerts_total: {
      type: 'counter',
      help: 'Total number of system alerts generated'
    },
    active_admin_sessions: {
      type: 'gauge',
      help: 'Number of active admin sessions'
    },
    service_health_status: {
      type: 'gauge',
      help: 'Health status of monitored services'
    }
  }
}));

// Swagger configuration for Admin API
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Travelowkey Admin Service API',
      version: '1.0.0',
      description: 'Administrative backend service for platform management, monitoring, and control',
      contact: {
        name: 'Travelowkey Admin Team',
        email: 'admin@travelowkey.com',
      },
    },
    servers: [
      {
        url: process.env.ADMIN_API_BASE_URL || 'http://localhost:3015',
        description: 'Admin Service API',
      },
    ],
    components: {
      securitySchemes: {
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'admin.session.id'
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        AdminUser: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            username: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string', enum: ['super_admin', 'admin', 'moderator', 'analyst'] },
            permissions: { type: 'array', items: { type: 'string' } },
            lastLogin: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['active', 'inactive', 'suspended'] }
          }
        },
        SystemMetrics: {
          type: 'object',
          properties: {
            cpu: { type: 'number' },
            memory: { type: 'number' },
            disk: { type: 'number' },
            network: { type: 'object' },
            services: { type: 'array' }
          }
        },
        DashboardWidget: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            title: { type: 'string' },
            config: { type: 'object' },
            position: { type: 'object' },
            refreshInterval: { type: 'number' }
          }
        }
      }
    },
    security: [{ sessionAuth: [] }, { bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint with comprehensive system status
app.get('/health', async (req, res) => {
  try {
    const systemHealth = await getSystemHealth();
    
    res.status(200).json({
      status: 'healthy',
      service: 'admin-service',
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      system: systemHealth,
      performance: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        activeAdminSessions: getActiveAdminSessionCount(),
        queuedJobs: await getQueuedJobsCount()
      }
    });
  } catch (error) {
    logger.error('Admin service health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Initialize services
let adminUserService;
let systemMonitoringService;
let serviceManagementService;
let userManagementService;
let bookingManagementService;
let financialManagementService;
let contentModerationService;
let analyticsDashboardService;
let configurationService;
let auditLogService;
let notificationCenterService;
let backupService;
let securityService;

async function initializeServices() {
  try {
    logger.info('Initializing admin services...');

    // Initialize core services
    adminUserService = new AdminUserService();
    systemMonitoringService = new SystemMonitoringService(io);
    serviceManagementService = new ServiceManagementService();
    userManagementService = new UserManagementService();
    bookingManagementService = new BookingManagementService();
    financialManagementService = new FinancialManagementService();
    contentModerationService = new ContentModerationService();
    analyticsDashboardService = new AnalyticsDashboardService(io);
    configurationService = new ConfigurationService();
    auditLogService = new AuditLogService();
    notificationCenterService = new NotificationCenterService(io);
    backupService = new BackupService();
    securityService = new SecurityService();

    // Initialize controllers
    const dashboardController = new DashboardController(analyticsDashboardService, systemMonitoringService);
    const systemController = new SystemController(systemMonitoringService, serviceManagementService);
    const usersController = new UsersController(userManagementService, auditLogService);
    const bookingsController = new BookingsController(bookingManagementService, auditLogService);
    const financeController = new FinanceController(financialManagementService, auditLogService);
    const contentController = new ContentController(contentModerationService, auditLogService);
    const analyticsController = new AnalyticsController(analyticsDashboardService);
    const configController = new ConfigController(configurationService, auditLogService);
    const auditController = new AuditController(auditLogService);
    const reportsController = new ReportsController(analyticsDashboardService, systemMonitoringService);
    const securityController = new SecurityController(securityService, auditLogService);

    // Setup routes with authentication and authorization
    app.use('/api/v1/dashboard', authenticateAdmin, require('./routes/dashboard')(dashboardController));
    app.use('/api/v1/system', authenticateAdmin, requireRole(['admin', 'super_admin']), require('./routes/system')(systemController));
    app.use('/api/v1/users', authenticateAdmin, requireRole(['moderator', 'admin', 'super_admin']), require('./routes/users')(usersController));
    app.use('/api/v1/bookings', authenticateAdmin, requireRole(['moderator', 'admin', 'super_admin']), require('./routes/bookings')(bookingsController));
    app.use('/api/v1/finance', authenticateAdmin, requireRole(['admin', 'super_admin']), require('./routes/finance')(financeController));
    app.use('/api/v1/content', authenticateAdmin, requireRole(['moderator', 'admin', 'super_admin']), require('./routes/content')(contentController));
    app.use('/api/v1/analytics', authenticateAdmin, require('./routes/analytics')(analyticsController));
    app.use('/api/v1/config', authenticateAdmin, requireRole(['admin', 'super_admin']), require('./routes/config')(configController));
    app.use('/api/v1/audit', authenticateAdmin, requireRole(['admin', 'super_admin']), require('./routes/audit')(auditController));
    app.use('/api/v1/reports', authenticateAdmin, require('./routes/reports')(reportsController));
    app.use('/api/v1/security', authenticateAdmin, requireRole(['admin', 'super_admin']), require('./routes/security')(securityController));

    logger.info('Admin services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize admin services:', error);
    throw error;
  }
}

// Admin authentication endpoints
app.post('/api/v1/auth/login', validateInput, auditLog, async (req, res) => {
  try {
    const { username, password, mfaCode } = req.body;
    
    logger.info('Admin login attempt', { username, ip: req.ip });

    const result = await adminUserService.authenticate({
      username,
      password,
      mfaCode,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    if (result.success) {
      req.session.user = result.user;
      req.session.loginTime = new Date();
      
      res.status(200).json({
        success: true,
        user: {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
          role: result.user.role,
          permissions: result.user.permissions,
          lastLogin: result.user.lastLogin
        },
        sessionExpiry: new Date(Date.now() + 8 * 60 * 60 * 1000)
      });

      // Notify via WebSocket
      io.emit('admin:login', {
        username: result.user.username,
        timestamp: new Date()
      });
      
    } else {
      res.status(401).json({
        success: false,
        error: result.error,
        requiresMFA: result.requiresMFA
      });
    }

  } catch (error) {
    logger.error('Admin login failed:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      code: 'ADMIN_LOGIN_ERROR'
    });
  }
});

app.post('/api/v1/auth/logout', authenticateAdmin, auditLog, async (req, res) => {
  try {
    const username = req.user.username;
    
    req.session.destroy((err) => {
      if (err) {
        logger.error('Session destruction failed:', err);
      }
      
      res.clearCookie('admin.session.id');
      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });

      // Notify via WebSocket
      io.emit('admin:logout', {
        username,
        timestamp: new Date()
      });
    });

  } catch (error) {
    logger.error('Admin logout failed:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

// System overview endpoint
app.get('/api/v1/overview', authenticateAdmin, async (req, res) => {
  try {
    const overview = await systemMonitoringService.getSystemOverview();
    
    res.status(200).json({
      success: true,
      data: overview,
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('System overview fetch failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'SYSTEM_OVERVIEW_ERROR'
    });
  }
});

// Real-time system metrics endpoint
app.get('/api/v1/metrics/realtime', authenticateAdmin, async (req, res) => {
  try {
    const metrics = await systemMonitoringService.getRealTimeMetrics();
    
    res.status(200).json({
      success: true,
      metrics,
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Real-time metrics fetch failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'REALTIME_METRICS_ERROR'
    });
  }
});

// Bulk operations endpoint
app.post('/api/v1/operations/bulk', authenticateAdmin, requireRole(['admin', 'super_admin']), auditLog, async (req, res) => {
  try {
    const { operation, targets, parameters } = req.body;
    const operationId = uuidv4();
    
    logger.info('Bulk operation initiated', {
      operationId,
      operation,
      targetCount: targets.length,
      adminUser: req.user.username
    });

    // Queue bulk operation
    const job = await systemMaintenanceQueue.add('bulk_operation', {
      operationId,
      operation,
      targets,
      parameters,
      adminUserId: req.user.id,
      timestamp: new Date()
    });

    res.status(202).json({
      success: true,
      operationId,
      jobId: job.id,
      status: 'queued',
      message: 'Bulk operation queued for processing'
    });

  } catch (error) {
    logger.error('Bulk operation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'BULK_OPERATION_ERROR'
    });
  }
});

// WebSocket authentication and connection handling
io.use(async (socket, next) => {
  try {
    const sessionId = socket.handshake.auth.sessionId;
    if (!sessionId) {
      throw new Error('No session ID provided');
    }

    // Verify admin session
    const session = await getAdminSession(sessionId);
    if (!session || !session.user) {
      throw new Error('Invalid or expired session');
    }

    socket.adminUser = session.user;
    socket.sessionId = sessionId;
    
    next();
  } catch (error) {
    logger.error('Admin WebSocket authentication failed:', error);
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  logger.info('Admin WebSocket connected', { 
    adminUser: socket.adminUser.username,
    socketId: socket.id 
  });

  // Join admin room
  socket.join('admin_room');
  socket.join(`admin:${socket.adminUser.id}`);

  // Handle dashboard subscriptions
  socket.on('subscribe:dashboard', async (dashboardType) => {
    try {
      socket.join(`dashboard:${dashboardType}`);
      
      // Send initial dashboard data
      const dashboardData = await analyticsDashboardService.getDashboardData(dashboardType);
      socket.emit('dashboard:data', dashboardData);
      
    } catch (error) {
      logger.error('Dashboard subscription failed:', error);
      socket.emit('error', { message: 'Failed to subscribe to dashboard' });
    }
  });

  // Handle system monitoring subscriptions
  socket.on('subscribe:monitoring', async (serviceNames) => {
    try {
      for (const serviceName of serviceNames) {
        socket.join(`monitoring:${serviceName}`);
      }
      
      // Send initial monitoring data
      const monitoringData = await systemMonitoringService.getMonitoringData(serviceNames);
      socket.emit('monitoring:data', monitoringData);
      
    } catch (error) {
      logger.error('Monitoring subscription failed:', error);
      socket.emit('error', { message: 'Failed to subscribe to monitoring' });
    }
  });

  // Handle live log streaming
  socket.on('subscribe:logs', async (filters) => {
    try {
      socket.join('logs_stream');
      
      // Setup log stream with filters
      await systemMonitoringService.setupLogStream(socket, filters);
      
    } catch (error) {
      logger.error('Log subscription failed:', error);
      socket.emit('error', { message: 'Failed to subscribe to logs' });
    }
  });

  socket.on('disconnect', () => {
    logger.info('Admin WebSocket disconnected', { 
      adminUser: socket.adminUser.username,
      socketId: socket.id 
    });
  });
});

// Scheduled tasks for admin operations
function setupScheduledTasks() {
  // System health check every minute
  cron.schedule('* * * * *', async () => {
    try {
      const health = await systemMonitoringService.performHealthCheck();
      io.to('admin_room').emit('system:health', health);
    } catch (error) {
      logger.error('Scheduled health check failed:', error);
    }
  });

  // Generate system reports every hour
  cron.schedule('0 * * * *', async () => {
    try {
      await systemMonitoringService.generateHourlyReport();
    } catch (error) {
      logger.error('Hourly report generation failed:', error);
    }
  });

  // Cleanup expired sessions every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    try {
      await adminUserService.cleanupExpiredSessions();
    } catch (error) {
      logger.error('Session cleanup failed:', error);
    }
  });

  // Daily system backup at 3 AM
  cron.schedule('0 3 * * *', async () => {
    try {
      await backupService.performDailyBackup();
    } catch (error) {
      logger.error('Daily backup failed:', error);
    }
  });

  // Weekly security audit
  cron.schedule('0 2 * * 0', async () => {
    try {
      await securityService.performWeeklyAudit();
    } catch (error) {
      logger.error('Weekly security audit failed:', error);
    }
  });

  logger.info('Admin scheduled tasks configured');
}

// Helper functions
async function getSystemHealth() {
  try {
    return await systemMonitoringService.getSystemHealth();
  } catch (error) {
    return { status: 'unknown', error: error.message };
  }
}

function getActiveAdminSessionCount() {
  return io.sockets.adapter.rooms.get('admin_room')?.size || 0;
}

async function getQueuedJobsCount() {
  try {
    const waiting = await systemMaintenanceQueue.getWaiting();
    const active = await systemMaintenanceQueue.getActive();
    return waiting.length + active.length;
  } catch (error) {
    return 0;
  }
}

async function getAdminSession(sessionId) {
  // Implementation would retrieve session from Redis
  // For now, return mock session
  return {
    user: { id: 'admin123', username: 'admin', role: 'super_admin' }
  };
}

// Apply audit logging to all admin routes
app.use('/api/v1', auditLog);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Admin endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    method: req.method
  });
});

// Initialize application
async function startServer() {
  try {
    // Connect to databases
    await connectPostgreSQL();
    await connectMongoDB();
    redisClient = await connectRedis();
    await connectElasticsearch();
    
    // Initialize session store
    sessionStore = new RedisStore({ client: redisClient });
    
    // Initialize Kafka
    await initializeKafka();
    
    // Initialize services
    await initializeServices();
    
    // Setup scheduled tasks
    setupScheduledTasks();
    
    const PORT = process.env.PORT || 3015;
    server.listen(PORT, () => {
      logger.info(`🚀 Admin Service running on port ${PORT}`);
      logger.info(`🛡️  Admin Panel: http://localhost:${PORT}/api-docs`);
      logger.info(`💚 Health Check: http://localhost:${PORT}/health`);
      logger.info(`🔌 Admin WebSocket: ws://localhost:${PORT}`);
      logger.info(`🎯 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down admin service gracefully');
      server.close(() => {
        logger.info('Admin service terminated');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start admin service:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = { app, server, io };