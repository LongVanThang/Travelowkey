const redis = require('redis');
const logger = require('../utils/logger');

let redisClient = null;
let redisSubscriber = null;
let redisPublisher = null;

const CACHE_TTL = {
  HOTEL_DETAILS: 3600, // 1 hour
  SEARCH_RESULTS: 900, // 15 minutes
  ROOM_AVAILABILITY: 300, // 5 minutes
  PRICING: 600, // 10 minutes
  AMENITIES: 7200, // 2 hours
  LOCATION_DATA: 86400 // 24 hours
};

const CACHE_KEYS = {
  HOTEL: 'hotel:',
  SEARCH: 'search:',
  ROOMS: 'rooms:',
  AVAILABILITY: 'availability:',
  PRICING: 'pricing:',
  AMENITIES: 'amenities:',
  INVENTORY: 'inventory:'
};

async function connectRedis() {
  try {
    const redisConfig = {
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        connectTimeout: 10000,
        lazyConnect: true,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: 3
      },
      password: process.env.REDIS_PASSWORD || undefined,
      db: process.env.REDIS_DB || 0,
      retryDelayOnFailover: 100,
      enableOfflineQueue: false,
      lazyConnect: true
    };

    // Main Redis client for general operations
    redisClient = redis.createClient(redisConfig);
    
    // Subscriber client for pub/sub operations
    redisSubscriber = redis.createClient(redisConfig);
    
    // Publisher client for pub/sub operations
    redisPublisher = redis.createClient(redisConfig);

    // Event handlers
    redisClient.on('error', (error) => {
      logger.error('Redis Client Error:', error);
    });

    redisClient.on('connect', () => {
      logger.info('Redis Client Connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis Client Ready');
    });

    redisClient.on('end', () => {
      logger.info('Redis Client Connection Ended');
    });

    redisSubscriber.on('error', (error) => {
      logger.error('Redis Subscriber Error:', error);
    });

    redisPublisher.on('error', (error) => {
      logger.error('Redis Publisher Error:', error);
    });

    // Connect all clients
    await redisClient.connect();
    await redisSubscriber.connect();
    await redisPublisher.connect();

    logger.info('Connected to Redis successfully');
    
    return { redisClient, redisSubscriber, redisPublisher };
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
}

// Caching utilities
async function setCache(key, value, ttl = CACHE_TTL.HOTEL_DETAILS) {
  try {
    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }
    
    const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
    await redisClient.setEx(key, ttl, serializedValue);
    return true;
  } catch (error) {
    logger.error('Cache set error:', error);
    return false;
  }
}

async function getCache(key, parseJson = true) {
  try {
    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }
    
    const value = await redisClient.get(key);
    if (!value) return null;
    
    return parseJson ? JSON.parse(value) : value;
  } catch (error) {
    logger.error('Cache get error:', error);
    return null;
  }
}

async function deleteCache(key) {
  try {
    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }
    
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.error('Cache delete error:', error);
    return false;
  }
}

async function deleteCachePattern(pattern) {
  try {
    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }
    
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    return true;
  } catch (error) {
    logger.error('Cache pattern delete error:', error);
    return false;
  }
}

async function setCacheHash(key, field, value, ttl = CACHE_TTL.HOTEL_DETAILS) {
  try {
    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }
    
    const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
    await redisClient.hSet(key, field, serializedValue);
    await redisClient.expire(key, ttl);
    return true;
  } catch (error) {
    logger.error('Cache hash set error:', error);
    return false;
  }
}

async function getCacheHash(key, field, parseJson = true) {
  try {
    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }
    
    const value = await redisClient.hGet(key, field);
    if (!value) return null;
    
    return parseJson ? JSON.parse(value) : value;
  } catch (error) {
    logger.error('Cache hash get error:', error);
    return null;
  }
}

async function getAllCacheHash(key, parseJson = true) {
  try {
    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }
    
    const hash = await redisClient.hGetAll(key);
    if (!hash || Object.keys(hash).length === 0) return null;
    
    if (parseJson) {
      const parsedHash = {};
      for (const [field, value] of Object.entries(hash)) {
        try {
          parsedHash[field] = JSON.parse(value);
        } catch {
          parsedHash[field] = value;
        }
      }
      return parsedHash;
    }
    
    return hash;
  } catch (error) {
    logger.error('Cache hash get all error:', error);
    return null;
  }
}

// Pub/Sub utilities
async function publishMessage(channel, message) {
  try {
    if (!redisPublisher) {
      throw new Error('Redis publisher not initialized');
    }
    
    const serializedMessage = typeof message === 'string' ? message : JSON.stringify(message);
    await redisPublisher.publish(channel, serializedMessage);
    return true;
  } catch (error) {
    logger.error('Publish message error:', error);
    return false;
  }
}

async function subscribeToChannel(channel, callback) {
  try {
    if (!redisSubscriber) {
      throw new Error('Redis subscriber not initialized');
    }
    
    await redisSubscriber.subscribe(channel, (message) => {
      try {
        const parsedMessage = JSON.parse(message);
        callback(parsedMessage);
      } catch {
        callback(message);
      }
    });
    
    logger.info(`Subscribed to channel: ${channel}`);
    return true;
  } catch (error) {
    logger.error('Subscribe error:', error);
    return false;
  }
}

function getClient() {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
}

function getSubscriber() {
  if (!redisSubscriber) {
    throw new Error('Redis subscriber not initialized. Call connectRedis() first.');
  }
  return redisSubscriber;
}

function getPublisher() {
  if (!redisPublisher) {
    throw new Error('Redis publisher not initialized. Call connectRedis() first.');
  }
  return redisPublisher;
}

async function closeConnection() {
  try {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
    }
    if (redisSubscriber) {
      await redisSubscriber.quit();
      redisSubscriber = null;
    }
    if (redisPublisher) {
      await redisPublisher.quit();
      redisPublisher = null;
    }
    logger.info('Redis connections closed');
  } catch (error) {
    logger.error('Error closing Redis connections:', error);
  }
}

module.exports = {
  connectRedis,
  getClient,
  getSubscriber,
  getPublisher,
  closeConnection,
  setCache,
  getCache,
  deleteCache,
  deleteCachePattern,
  setCacheHash,
  getCacheHash,
  getAllCacheHash,
  publishMessage,
  subscribeToChannel,
  CACHE_TTL,
  CACHE_KEYS
};