const express = require('express');
const { getClient: getElasticsearchClient } = require('../config/elasticsearch');
const { getClient: getRedisClient } = require('../config/redis');
const { getProducer: getKafkaProducer } = require('../config/kafka');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Basic health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'hotel-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * @swagger
 * /api/health/detailed:
 *   get:
 *     summary: Detailed health check with dependencies
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Detailed health status
 */
router.get('/detailed', async (req, res) => {
  const health = {
    status: 'healthy',
    service: 'hotel-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    dependencies: {}
  };

  // Check Elasticsearch
  try {
    const esClient = getElasticsearchClient();
    await esClient.ping();
    health.dependencies.elasticsearch = { status: 'healthy' };
  } catch (error) {
    health.dependencies.elasticsearch = { 
      status: 'unhealthy', 
      error: error.message 
    };
    health.status = 'degraded';
  }

  // Check Redis
  try {
    const redisClient = getRedisClient();
    await redisClient.ping();
    health.dependencies.redis = { status: 'healthy' };
  } catch (error) {
    health.dependencies.redis = { 
      status: 'unhealthy', 
      error: error.message 
    };
    health.status = 'degraded';
  }

  // Check Kafka
  try {
    const kafkaProducer = getKafkaProducer();
    // Basic check - if we can get the producer instance
    health.dependencies.kafka = { status: 'healthy' };
  } catch (error) {
    health.dependencies.kafka = { 
      status: 'unhealthy', 
      error: error.message 
    };
    health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * @swagger
 * /api/health/ready:
 *   get:
 *     summary: Readiness check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is ready
 */
router.get('/ready', async (req, res) => {
  try {
    // Check if all critical dependencies are available
    const esClient = getElasticsearchClient();
    const redisClient = getRedisClient();
    
    await Promise.all([
      esClient.ping(),
      redisClient.ping()
    ]);

    res.json({
      status: 'ready',
      service: 'hotel-service',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'not ready',
      service: 'hotel-service',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/health/live:
 *   get:
 *     summary: Liveness check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is alive
 */
router.get('/live', (req, res) => {
  res.json({
    status: 'alive',
    service: 'hotel-service',
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage()
  });
});

module.exports = router;