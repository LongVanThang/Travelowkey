const { Kafka } = require('kafkajs');
const logger = require('../utils/logger');

let kafka = null;
let producer = null;
let consumer = null;

const TOPICS = {
  HOTEL_EVENTS: 'hotel-events',
  BOOKING_EVENTS: 'booking-events',
  INVENTORY_EVENTS: 'inventory-events',
  PRICING_EVENTS: 'pricing-events',
  USER_EVENTS: 'user-events',
  NOTIFICATION_EVENTS: 'notification-events'
};

const EVENT_TYPES = {
  HOTEL_CREATED: 'hotel.created',
  HOTEL_UPDATED: 'hotel.updated',
  HOTEL_DELETED: 'hotel.deleted',
  ROOM_AVAILABILITY_CHANGED: 'room.availability.changed',
  BOOKING_CREATED: 'booking.created',
  BOOKING_CANCELLED: 'booking.cancelled',
  INVENTORY_UPDATED: 'inventory.updated',
  PRICING_UPDATED: 'pricing.updated',
  SEARCH_PERFORMED: 'search.performed'
};

async function connectKafka() {
  try {
    kafka = new Kafka({
      clientId: 'hotel-service',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      connectionTimeout: 10000,
      authenticationTimeout: 10000,
      reauthenticationThreshold: 10000,
      retry: {
        initialRetryTime: 100,
        retries: 8
      },
      ssl: process.env.KAFKA_SSL === 'true' ? {
        rejectUnauthorized: false
      } : false,
      sasl: process.env.KAFKA_USERNAME && process.env.KAFKA_PASSWORD ? {
        mechanism: 'plain',
        username: process.env.KAFKA_USERNAME,
        password: process.env.KAFKA_PASSWORD
      } : undefined
    });

    // Create producer
    producer = kafka.producer({
      maxInFlightRequests: 1,
      idempotent: true,
      transactionTimeout: 30000,
      retry: {
        initialRetryTime: 100,
        retries: 5
      }
    });

    // Create consumer
    consumer = kafka.consumer({
      groupId: 'hotel-service-group',
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      maxWaitTimeInMs: 5000,
      retry: {
        initialRetryTime: 100,
        retries: 5
      }
    });

    // Connect producer and consumer
    await producer.connect();
    await consumer.connect();

    // Subscribe to relevant topics
    await consumer.subscribe({
      topics: [
        TOPICS.BOOKING_EVENTS,
        TOPICS.USER_EVENTS,
        TOPICS.INVENTORY_EVENTS
      ],
      fromBeginning: false
    });

    // Start consuming messages
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          await handleIncomingEvent(topic, event);
        } catch (error) {
          logger.error('Error processing Kafka message:', error);
        }
      }
    });

    logger.info('Connected to Kafka successfully');
    return { producer, consumer };
  } catch (error) {
    logger.error('Failed to connect to Kafka:', error);
    throw error;
  }
}

async function handleIncomingEvent(topic, event) {
  try {
    logger.info(`Received event from topic ${topic}:`, event);
    
    switch (topic) {
      case TOPICS.BOOKING_EVENTS:
        await handleBookingEvent(event);
        break;
      case TOPICS.USER_EVENTS:
        await handleUserEvent(event);
        break;
      case TOPICS.INVENTORY_EVENTS:
        await handleInventoryEvent(event);
        break;
      default:
        logger.warn(`Unhandled topic: ${topic}`);
    }
  } catch (error) {
    logger.error('Error handling incoming event:', error);
  }
}

async function handleBookingEvent(event) {
  try {
    switch (event.type) {
      case 'booking.created':
        // Update room availability
        logger.info('Processing booking created event:', event.data);
        // Implementation would update room availability in Elasticsearch
        break;
      case 'booking.cancelled':
        // Restore room availability
        logger.info('Processing booking cancelled event:', event.data);
        // Implementation would restore room availability in Elasticsearch
        break;
      default:
        logger.warn(`Unhandled booking event type: ${event.type}`);
    }
  } catch (error) {
    logger.error('Error handling booking event:', error);
  }
}

async function handleUserEvent(event) {
  try {
    switch (event.type) {
      case 'user.preferences.updated':
        // Cache invalidation for user-specific recommendations
        logger.info('Processing user preferences update:', event.data);
        break;
      default:
        logger.warn(`Unhandled user event type: ${event.type}`);
    }
  } catch (error) {
    logger.error('Error handling user event:', error);
  }
}

async function handleInventoryEvent(event) {
  try {
    switch (event.type) {
      case 'inventory.updated':
        // Update hotel/room inventory in Elasticsearch
        logger.info('Processing inventory update:', event.data);
        break;
      default:
        logger.warn(`Unhandled inventory event type: ${event.type}`);
    }
  } catch (error) {
    logger.error('Error handling inventory event:', error);
  }
}

async function publishEvent(topic, eventType, data, key = null) {
  try {
    if (!producer) {
      throw new Error('Kafka producer not initialized');
    }

    const event = {
      id: require('uuid').v4(),
      type: eventType,
      timestamp: new Date().toISOString(),
      service: 'hotel-service',
      data
    };

    await producer.send({
      topic,
      messages: [{
        key: key || event.id,
        value: JSON.stringify(event),
        timestamp: Date.now()
      }]
    });

    logger.info(`Published event to ${topic}:`, event);
    return true;
  } catch (error) {
    logger.error('Error publishing event:', error);
    return false;
  }
}

// Convenience methods for common events
async function publishHotelEvent(eventType, hotelData) {
  return publishEvent(TOPICS.HOTEL_EVENTS, eventType, hotelData, hotelData.id);
}

async function publishInventoryEvent(eventType, inventoryData) {
  return publishEvent(TOPICS.INVENTORY_EVENTS, eventType, inventoryData);
}

async function publishSearchEvent(searchData) {
  return publishEvent(TOPICS.HOTEL_EVENTS, EVENT_TYPES.SEARCH_PERFORMED, searchData);
}

async function publishNotificationEvent(notificationData) {
  return publishEvent(TOPICS.NOTIFICATION_EVENTS, 'notification.send', notificationData);
}

function getProducer() {
  if (!producer) {
    throw new Error('Kafka producer not initialized. Call connectKafka() first.');
  }
  return producer;
}

function getConsumer() {
  if (!consumer) {
    throw new Error('Kafka consumer not initialized. Call connectKafka() first.');
  }
  return consumer;
}

async function closeConnection() {
  try {
    if (producer) {
      await producer.disconnect();
      producer = null;
    }
    if (consumer) {
      await consumer.disconnect();
      consumer = null;
    }
    logger.info('Kafka connections closed');
  } catch (error) {
    logger.error('Error closing Kafka connections:', error);
  }
}

module.exports = {
  connectKafka,
  getProducer,
  getConsumer,
  closeConnection,
  publishEvent,
  publishHotelEvent,
  publishInventoryEvent,
  publishSearchEvent,
  publishNotificationEvent,
  TOPICS,
  EVENT_TYPES
};