const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hotel Service API',
      version: '1.0.0',
      description: 'Hotel Service for Travelowkey - Handles hotel search, booking, and inventory management',
      contact: {
        name: 'Travelowkey Team',
        email: 'dev@travelowkey.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3002',
        description: 'Development server'
      },
      {
        url: 'https://api.travelowkey.com/hotel',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Hotel: {
          type: 'object',
          required: ['id', 'name', 'location', 'category'],
          properties: {
            id: {
              type: 'string',
              description: 'Unique hotel identifier',
              example: 'hotel-123'
            },
            name: {
              type: 'string',
              description: 'Hotel name',
              example: 'Grand Plaza Hotel'
            },
            description: {
              type: 'string',
              description: 'Hotel description',
              example: 'Luxury 5-star hotel in the heart of the city'
            },
            location: {
              type: 'object',
              properties: {
                country: { type: 'string', example: 'Indonesia' },
                countryCode: { type: 'string', example: 'ID' },
                state: { type: 'string', example: 'DKI Jakarta' },
                city: { type: 'string', example: 'Jakarta' },
                district: { type: 'string', example: 'Central Jakarta' },
                address: { type: 'string', example: '123 Main Street' },
                postalCode: { type: 'string', example: '10110' },
                coordinates: {
                  type: 'object',
                  properties: {
                    lat: { type: 'number', example: -6.2088 },
                    lon: { type: 'number', example: 106.8456 }
                  }
                },
                timezone: { type: 'string', example: 'Asia/Jakarta' }
              }
            },
            category: {
              type: 'string',
              enum: ['budget', 'mid-range', 'luxury', 'boutique', 'resort'],
              example: 'luxury'
            },
            starRating: {
              type: 'number',
              minimum: 1,
              maximum: 5,
              example: 5
            },
            guestRating: {
              type: 'number',
              minimum: 0,
              maximum: 10,
              example: 8.5
            },
            reviewCount: {
              type: 'integer',
              minimum: 0,
              example: 1250
            },
            priceRange: {
              type: 'object',
              properties: {
                min: { type: 'number', example: 100 },
                max: { type: 'number', example: 500 },
                currency: { type: 'string', example: 'USD' }
              }
            },
            amenities: {
              type: 'array',
              items: { type: 'string' },
              example: ['wifi', 'pool', 'gym', 'spa', 'restaurant']
            },
            features: {
              type: 'array',
              items: { type: 'string' },
              example: ['business-center', 'conference-rooms', 'valet-parking']
            }
          }
        },
        RoomType: {
          type: 'object',
          required: ['id', 'name', 'maxOccupancy', 'basePrice'],
          properties: {
            id: { type: 'string', example: 'room-type-123' },
            name: { type: 'string', example: 'Deluxe King Room' },
            description: { type: 'string', example: 'Spacious room with king bed and city view' },
            maxOccupancy: { type: 'integer', minimum: 1, example: 2 },
            bedType: { type: 'string', example: 'king' },
            size: { type: 'number', example: 35.5 },
            amenities: {
              type: 'array',
              items: { type: 'string' },
              example: ['wifi', 'minibar', 'safe', 'ac']
            },
            basePrice: { type: 'number', example: 150 },
            availability: { type: 'integer', example: 5 }
          }
        },
        SearchRequest: {
          type: 'object',
          required: ['destination', 'checkIn', 'checkOut', 'guests'],
          properties: {
            destination: {
              type: 'string',
              description: 'City, hotel name, or landmark',
              example: 'Jakarta'
            },
            checkIn: {
              type: 'string',
              format: 'date',
              example: '2024-01-15'
            },
            checkOut: {
              type: 'string',
              format: 'date',
              example: '2024-01-17'
            },
            guests: {
              type: 'object',
              properties: {
                adults: { type: 'integer', minimum: 1, example: 2 },
                children: { type: 'integer', minimum: 0, example: 1 },
                rooms: { type: 'integer', minimum: 1, example: 1 }
              }
            },
            filters: {
              type: 'object',
              properties: {
                priceRange: {
                  type: 'object',
                  properties: {
                    min: { type: 'number', example: 50 },
                    max: { type: 'number', example: 300 }
                  }
                },
                starRating: { type: 'array', items: { type: 'integer' }, example: [4, 5] },
                amenities: { type: 'array', items: { type: 'string' }, example: ['wifi', 'pool'] },
                category: { type: 'string', example: 'luxury' },
                guestRating: { type: 'number', minimum: 0, maximum: 10, example: 7.5 }
              }
            },
            sorting: {
              type: 'object',
              properties: {
                sortBy: {
                  type: 'string',
                  enum: ['price', 'rating', 'distance', 'popularity'],
                  example: 'price'
                },
                sortOrder: {
                  type: 'string',
                  enum: ['asc', 'desc'],
                  example: 'asc'
                }
              }
            }
          }
        },
        SearchResponse: {
          type: 'object',
          properties: {
            hotels: {
              type: 'array',
              items: { $ref: '#/components/schemas/Hotel' }
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 20 },
                total: { type: 'integer', example: 150 },
                pages: { type: 'integer', example: 8 }
              }
            },
            filters: {
              type: 'object',
              properties: {
                appliedFilters: { type: 'object' },
                availableFilters: { type: 'object' }
              }
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'integer' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './src/models/*.js'
  ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;