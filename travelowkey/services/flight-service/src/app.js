const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const compression = require('compression')
const morgan = require('morgan')
const swaggerUi = require('swagger-ui-express')
const prometheusMiddleware = require('express-prometheus-middleware')

const config = require('./config/config')
const logger = require('./config/logger')
const database = require('./config/database')
const redis = require('./config/redis')
const kafka = require('./config/kafka')
const swaggerSpec = require('./config/swagger')

// Import routes
const flightRoutes = require('./routes/flightRoutes')
const airlineRoutes = require('./routes/airlineRoutes')
const airportRoutes = require('./routes/airportRoutes')
const healthRoutes = require('./routes/healthRoutes')

// Import middleware
const authMiddleware = require('./middleware/authMiddleware')
const errorMiddleware = require('./middleware/errorMiddleware')
const rateLimitMiddleware = require('./middleware/rateLimitMiddleware')

const app = express()

// Trust proxy for proper client IP detection
app.set('trust proxy', true)

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}))

// CORS configuration
app.use(cors({
  origin: config.cors.allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-Correlation-Id']
}))

// Compression and parsing middleware
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}))

// Prometheus metrics
app.use(prometheusMiddleware({
  metricsPath: '/metrics',
  collectDefaultMetrics: true,
  requestDurationBuckets: [0.1, 0.5, 1, 1.5, 2, 3, 5, 10],
  requestLengthBuckets: [512, 1024, 5120, 10240, 51200, 102400],
  responseLengthBuckets: [512, 1024, 5120, 10240, 51200, 102400]
}))

// Rate limiting
app.use(rateLimitMiddleware)

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// Health check routes (no auth required)
app.use('/health', healthRoutes)

// Authentication middleware for protected routes
app.use('/api/v1', authMiddleware)

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

// API Routes
app.use('/api/v1/flights', flightRoutes)
app.use('/api/v1/airlines', airlineRoutes)
app.use('/api/v1/airports', airportRoutes)

// Default route
app.get('/', (req, res) => {
  res.json({
    service: 'Travelowkey Flight Service',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    docs: '/api-docs',
    health: '/health'
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  })
})

// Global error handler
app.use(errorMiddleware)

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully')
  
  // Close database connections
  await database.close()
  
  // Close Redis connection
  await redis.disconnect()
  
  // Close Kafka connections
  await kafka.disconnect()
  
  process.exit(0)
})

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully')
  
  // Close database connections
  await database.close()
  
  // Close Redis connection
  await redis.disconnect()
  
  // Close Kafka connections
  await kafka.disconnect()
  
  process.exit(0)
})

// Start server
const PORT = config.port
const server = app.listen(PORT, () => {
  logger.info(`Flight Service running on port ${PORT}`)
  logger.info(`Environment: ${config.nodeEnv}`)
  logger.info(`API Documentation: http://localhost:${PORT}/api-docs`)
  logger.info(`Health Check: http://localhost:${PORT}/health`)
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err)
  server.close(() => {
    process.exit(1)
  })
})

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err)
  process.exit(1)
})

module.exports = app