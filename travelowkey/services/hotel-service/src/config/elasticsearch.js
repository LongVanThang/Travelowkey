const { Client } = require('@elastic/elasticsearch');
const logger = require('../utils/logger');

let esClient = null;

const HOTEL_INDEX = 'hotels';
const ROOM_INDEX = 'rooms';

// Elasticsearch hotel mapping
const hotelMapping = {
  properties: {
    id: { type: 'keyword' },
    name: {
      type: 'text',
      analyzer: 'standard',
      fields: {
        keyword: { type: 'keyword' },
        suggest: {
          type: 'search_as_you_type',
          max_shingle_size: 3
        }
      }
    },
    description: {
      type: 'text',
      analyzer: 'standard'
    },
    location: {
      properties: {
        country: { type: 'keyword' },
        countryCode: { type: 'keyword' },
        state: { type: 'keyword' },
        city: { type: 'keyword' },
        district: { type: 'keyword' },
        address: { type: 'text' },
        postalCode: { type: 'keyword' },
        coordinates: { type: 'geo_point' },
        timezone: { type: 'keyword' }
      }
    },
    category: { type: 'keyword' },
    starRating: { type: 'float' },
    guestRating: { type: 'float' },
    reviewCount: { type: 'integer' },
    priceRange: {
      properties: {
        min: { type: 'float' },
        max: { type: 'float' },
        currency: { type: 'keyword' }
      }
    },
    amenities: { type: 'keyword' },
    features: { type: 'keyword' },
    policies: {
      properties: {
        checkIn: { type: 'keyword' },
        checkOut: { type: 'keyword' },
        cancellation: { type: 'text' },
        petPolicy: { type: 'text' },
        childPolicy: { type: 'text' }
      }
    },
    contact: {
      properties: {
        phone: { type: 'keyword' },
        email: { type: 'keyword' },
        website: { type: 'keyword' }
      }
    },
    images: {
      type: 'nested',
      properties: {
        url: { type: 'keyword' },
        alt: { type: 'text' },
        type: { type: 'keyword' },
        isPrimary: { type: 'boolean' }
      }
    },
    roomTypes: {
      type: 'nested',
      properties: {
        id: { type: 'keyword' },
        name: { type: 'text' },
        maxOccupancy: { type: 'integer' },
        bedType: { type: 'keyword' },
        size: { type: 'float' },
        amenities: { type: 'keyword' },
        basePrice: { type: 'float' },
        availability: { type: 'integer' }
      }
    },
    status: { type: 'keyword' },
    isActive: { type: 'boolean' },
    sustainabilityCertifications: { type: 'keyword' },
    accessibility: { type: 'keyword' },
    nearbyAttractions: {
      type: 'nested',
      properties: {
        name: { type: 'text' },
        distance: { type: 'float' },
        type: { type: 'keyword' }
      }
    },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' },
    lastInventoryUpdate: { type: 'date' }
  }
};

// Room inventory mapping
const roomMapping = {
  properties: {
    id: { type: 'keyword' },
    hotelId: { type: 'keyword' },
    roomNumber: { type: 'keyword' },
    roomTypeId: { type: 'keyword' },
    floor: { type: 'integer' },
    status: { type: 'keyword' },
    availability: {
      type: 'nested',
      properties: {
        date: { type: 'date' },
        isAvailable: { type: 'boolean' },
        price: { type: 'float' },
        restrictions: { type: 'text' }
      }
    },
    maintenance: {
      properties: {
        isUnderMaintenance: { type: 'boolean' },
        maintenanceStart: { type: 'date' },
        maintenanceEnd: { type: 'date' },
        reason: { type: 'text' }
      }
    },
    lastCleaned: { type: 'date' },
    lastOccupied: { type: 'date' },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
  }
};

async function connectElasticsearch() {
  try {
    esClient = new Client({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      auth: process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD 
        ? {
            username: process.env.ELASTICSEARCH_USERNAME,
            password: process.env.ELASTICSEARCH_PASSWORD
          }
        : undefined,
      tls: process.env.ELASTICSEARCH_TLS === 'true' 
        ? {
            rejectUnauthorized: false
          }
        : undefined,
      requestTimeout: 30000,
      pingTimeout: 3000,
      maxRetries: 3
    });

    // Test connection
    await esClient.ping();
    logger.info('Connected to Elasticsearch successfully');

    // Create indices if they don't exist
    await createIndices();
    
    return esClient;
  } catch (error) {
    logger.error('Failed to connect to Elasticsearch:', error);
    throw error;
  }
}

async function createIndices() {
  try {
    // Create hotels index
    const hotelIndexExists = await esClient.indices.exists({ index: HOTEL_INDEX });
    if (!hotelIndexExists) {
      await esClient.indices.create({
        index: HOTEL_INDEX,
        body: {
          settings: {
            number_of_shards: 3,
            number_of_replicas: 1,
            analysis: {
              analyzer: {
                hotel_search_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: [
                    'lowercase',
                    'asciifolding',
                    'stop',
                    'snowball'
                  ]
                }
              }
            }
          },
          mappings: hotelMapping
        }
      });
      logger.info(`Created ${HOTEL_INDEX} index`);
    }

    // Create rooms index
    const roomIndexExists = await esClient.indices.exists({ index: ROOM_INDEX });
    if (!roomIndexExists) {
      await esClient.indices.create({
        index: ROOM_INDEX,
        body: {
          settings: {
            number_of_shards: 2,
            number_of_replicas: 1
          },
          mappings: roomMapping
        }
      });
      logger.info(`Created ${ROOM_INDEX} index`);
    }

  } catch (error) {
    logger.error('Failed to create indices:', error);
    throw error;
  }
}

function getClient() {
  if (!esClient) {
    throw new Error('Elasticsearch client not initialized. Call connectElasticsearch() first.');
  }
  return esClient;
}

async function closeConnection() {
  if (esClient) {
    await esClient.close();
    esClient = null;
    logger.info('Elasticsearch connection closed');
  }
}

module.exports = {
  connectElasticsearch,
  getClient,
  closeConnection,
  HOTEL_INDEX,
  ROOM_INDEX,
  hotelMapping,
  roomMapping
};