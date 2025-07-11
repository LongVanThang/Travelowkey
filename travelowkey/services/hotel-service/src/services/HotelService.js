const { getClient: getElasticsearchClient, HOTEL_INDEX } = require('../config/elasticsearch');
const { setCache, getCache, deleteCache, CACHE_TTL, CACHE_KEYS } = require('../config/redis');
const { publishHotelEvent, EVENT_TYPES } = require('../config/kafka');
const Hotel = require('../models/Hotel');
const logger = require('../utils/logger');
const axios = require('axios');
const geolib = require('geolib');

class HotelService {
  constructor() {
    this.esClient = null;
    this.externalAPIs = {
      bookingCom: process.env.BOOKING_COM_API_URL,
      expedia: process.env.EXPEDIA_API_URL,
      amadeus: process.env.AMADEUS_API_URL
    };
  }

  async initialize() {
    this.esClient = getElasticsearchClient();
  }

  // Hotel CRUD operations
  async createHotel(hotelData) {
    try {
      const hotel = new Hotel(hotelData);
      const validationErrors = hotel.validate();
      
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Check for duplicate hotel
      const existingHotel = await this.findDuplicateHotel(hotel);
      if (existingHotel) {
        throw new Error('Hotel with similar name and location already exists');
      }

      // Index in Elasticsearch
      const esDocument = hotel.toElasticsearchDocument();
      await this.esClient.index({
        index: HOTEL_INDEX,
        id: hotel.id,
        body: esDocument
      });

      // Cache the hotel
      const cacheKey = `${CACHE_KEYS.HOTEL}${hotel.id}`;
      await setCache(cacheKey, hotel.toPublicJson(), CACHE_TTL.HOTEL_DETAILS);

      // Publish event
      await publishHotelEvent(EVENT_TYPES.HOTEL_CREATED, hotel.toPublicJson());

      logger.info(`Hotel created successfully: ${hotel.id}`);
      return hotel.toPublicJson();
    } catch (error) {
      logger.error('Error creating hotel:', error);
      throw error;
    }
  }

  async getHotelById(hotelId) {
    try {
      // Check cache first
      const cacheKey = `${CACHE_KEYS.HOTEL}${hotelId}`;
      const cachedHotel = await getCache(cacheKey);
      if (cachedHotel) {
        return cachedHotel;
      }

      // Get from Elasticsearch
      const response = await this.esClient.get({
        index: HOTEL_INDEX,
        id: hotelId
      });

      if (!response.found) {
        return null;
      }

      const hotel = Hotel.fromElasticsearchDocument(response);
      const publicData = hotel.toPublicJson();

      // Cache the result
      await setCache(cacheKey, publicData, CACHE_TTL.HOTEL_DETAILS);

      return publicData;
    } catch (error) {
      if (error.statusCode === 404) {
        return null;
      }
      logger.error('Error getting hotel by ID:', error);
      throw error;
    }
  }

  async updateHotel(hotelId, updateData) {
    try {
      // Get existing hotel
      const existingHotel = await this.getHotelById(hotelId);
      if (!existingHotel) {
        throw new Error('Hotel not found');
      }

      // Merge updates
      const updatedData = { ...existingHotel, ...updateData, updatedAt: new Date() };
      const hotel = new Hotel(updatedData);
      
      const validationErrors = hotel.validate();
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Update in Elasticsearch
      const esDocument = hotel.toElasticsearchDocument();
      await this.esClient.update({
        index: HOTEL_INDEX,
        id: hotelId,
        body: { doc: esDocument }
      });

      // Update cache
      const cacheKey = `${CACHE_KEYS.HOTEL}${hotelId}`;
      await setCache(cacheKey, hotel.toPublicJson(), CACHE_TTL.HOTEL_DETAILS);

      // Invalidate related caches
      await this.invalidateSearchCaches(hotel.location.city);

      // Publish event
      await publishHotelEvent(EVENT_TYPES.HOTEL_UPDATED, hotel.toPublicJson());

      logger.info(`Hotel updated successfully: ${hotelId}`);
      return hotel.toPublicJson();
    } catch (error) {
      logger.error('Error updating hotel:', error);
      throw error;
    }
  }

  async deleteHotel(hotelId) {
    try {
      // Get existing hotel for event publishing
      const existingHotel = await this.getHotelById(hotelId);
      if (!existingHotel) {
        throw new Error('Hotel not found');
      }

      // Delete from Elasticsearch
      await this.esClient.delete({
        index: HOTEL_INDEX,
        id: hotelId
      });

      // Delete from cache
      const cacheKey = `${CACHE_KEYS.HOTEL}${hotelId}`;
      await deleteCache(cacheKey);

      // Invalidate related caches
      await this.invalidateSearchCaches(existingHotel.location.city);

      // Publish event
      await publishHotelEvent(EVENT_TYPES.HOTEL_DELETED, { id: hotelId });

      logger.info(`Hotel deleted successfully: ${hotelId}`);
      return true;
    } catch (error) {
      logger.error('Error deleting hotel:', error);
      throw error;
    }
  }

  // Search functionality
  async searchHotels(searchParams) {
    try {
      const {
        destination,
        checkIn,
        checkOut,
        guests = { adults: 1, children: 0, rooms: 1 },
        filters = {},
        sorting = { sortBy: 'relevance', sortOrder: 'desc' },
        page = 1,
        limit = 20
      } = searchParams;

      // Generate cache key
      const searchKey = this.generateSearchCacheKey(searchParams);
      const cachedResults = await getCache(searchKey);
      if (cachedResults) {
        return cachedResults;
      }

      // Build Elasticsearch query
      const query = this.buildSearchQuery(destination, filters, guests);
      
      // Build sort configuration
      const sort = this.buildSortConfiguration(sorting, destination);

      // Execute search
      const searchResponse = await this.esClient.search({
        index: HOTEL_INDEX,
        body: {
          query,
          sort,
          from: (page - 1) * limit,
          size: limit,
          _source: [
            'id', 'name', 'shortDescription', 'location', 'category',
            'starRating', 'guestRating', 'reviewCount', 'priceRange',
            'amenities', 'images', 'isFeatured', 'isPromoted'
          ]
        }
      });

      // Process results
      const hotels = searchResponse.body.hits.hits.map(hit => {
        const hotel = Hotel.fromElasticsearchDocument(hit);
        return hotel.toSearchResult();
      });

      // Get availability and pricing for the date range
      const hotelsWithAvailability = await this.enrichWithAvailability(
        hotels, checkIn, checkOut, guests
      );

      // Build pagination info
      const total = searchResponse.body.hits.total.value;
      const pages = Math.ceil(total / limit);

      const result = {
        hotels: hotelsWithAvailability,
        pagination: {
          page,
          limit,
          total,
          pages
        },
        filters: {
          appliedFilters: filters,
          availableFilters: await this.getAvailableFilters(destination)
        },
        searchTime: searchResponse.body.took,
        timestamp: new Date().toISOString()
      };

      // Cache the results
      await setCache(searchKey, result, CACHE_TTL.SEARCH_RESULTS);

      // Publish search event for analytics
      await this.publishSearchEvent(searchParams, total);

      return result;
    } catch (error) {
      logger.error('Error searching hotels:', error);
      throw error;
    }
  }

  // Build Elasticsearch query
  buildSearchQuery(destination, filters, guests) {
    const must = [];
    const filter = [];
    const should = [];

    // Base query for active hotels
    filter.push({ term: { isActive: true } });
    filter.push({ term: { status: 'active' } });

    // Destination search
    if (destination) {
      should.push(
        { match: { 'name.suggest': { query: destination, boost: 3 } } },
        { match: { 'location.city': { query: destination, boost: 2 } } },
        { match: { 'location.district': { query: destination, boost: 1.5 } } },
        { match: { description: { query: destination, boost: 1 } } }
      );
    }

    // Apply filters
    if (filters.priceRange) {
      if (filters.priceRange.min) {
        filter.push({ range: { 'priceRange.min': { gte: filters.priceRange.min } } });
      }
      if (filters.priceRange.max) {
        filter.push({ range: { 'priceRange.max': { lte: filters.priceRange.max } } });
      }
    }

    if (filters.starRating && filters.starRating.length > 0) {
      filter.push({ terms: { starRating: filters.starRating } });
    }

    if (filters.guestRating) {
      filter.push({ range: { guestRating: { gte: filters.guestRating } } });
    }

    if (filters.category) {
      filter.push({ term: { category: filters.category } });
    }

    if (filters.amenities && filters.amenities.length > 0) {
      filter.push({ terms: { amenities: filters.amenities } });
    }

    // Guest capacity filter
    if (guests.adults + guests.children > 2) {
      filter.push({
        nested: {
          path: 'roomTypes',
          query: {
            range: { 'roomTypes.maxOccupancy': { gte: guests.adults + guests.children } }
          }
        }
      });
    }

    // Geographic filter if coordinates provided
    if (filters.location && filters.location.coordinates) {
      filter.push({
        geo_distance: {
          distance: filters.location.radius || '50km',
          'location.coordinates': filters.location.coordinates
        }
      });
    }

    // Boost featured and promoted hotels
    should.push(
      { term: { isFeatured: { value: true, boost: 2 } } },
      { term: { isPromoted: { value: true, boost: 1.5 } } }
    );

    const query = {
      bool: {
        must,
        filter,
        should,
        minimum_should_match: destination ? 1 : 0
      }
    };

    return query;
  }

  // Build sort configuration
  buildSortConfiguration(sorting, destination) {
    const sort = [];

    switch (sorting.sortBy) {
      case 'price':
        sort.push({ 'priceRange.min': { order: sorting.sortOrder || 'asc' } });
        break;
      case 'rating':
        sort.push({ guestRating: { order: sorting.sortOrder || 'desc' } });
        break;
      case 'popularity':
        sort.push({ reviewCount: { order: 'desc' } });
        break;
      case 'distance':
        if (destination && this.isCoordinates(destination)) {
          sort.push({
            _geo_distance: {
              'location.coordinates': destination,
              order: 'asc',
              unit: 'km'
            }
          });
        }
        break;
      default: // relevance
        sort.push({ _score: { order: 'desc' } });
    }

    // Secondary sort by rating
    if (sorting.sortBy !== 'rating') {
      sort.push({ guestRating: { order: 'desc' } });
    }

    return sort;
  }

  // Enrich hotels with availability and pricing
  async enrichWithAvailability(hotels, checkIn, checkOut, guests) {
    const enrichedHotels = [];

    for (const hotel of hotels) {
      try {
        // Get availability from room service or external APIs
        const availability = await this.getHotelAvailability(
          hotel.id, checkIn, checkOut, guests
        );

        if (availability.isAvailable) {
          enrichedHotels.push({
            ...hotel,
            availability: {
              isAvailable: true,
              lowestPrice: availability.lowestPrice,
              currency: availability.currency,
              roomsAvailable: availability.roomsAvailable,
              lastUpdate: availability.lastUpdate
            }
          });
        }
      } catch (error) {
        logger.warn(`Failed to get availability for hotel ${hotel.id}:`, error);
        // Include hotel without availability info
        enrichedHotels.push({
          ...hotel,
          availability: {
            isAvailable: false,
            error: 'Availability check failed'
          }
        });
      }
    }

    return enrichedHotels;
  }

  // Get hotel availability (mock implementation)
  async getHotelAvailability(hotelId, checkIn, checkOut, guests) {
    try {
      // This would typically call the room service or external booking APIs
      // For now, we'll return mock data
      const cacheKey = `${CACHE_KEYS.AVAILABILITY}${hotelId}:${checkIn}:${checkOut}`;
      const cached = await getCache(cacheKey);
      if (cached) {
        return cached;
      }

      // Mock availability calculation
      const availability = {
        isAvailable: Math.random() > 0.2, // 80% availability
        lowestPrice: Math.floor(Math.random() * 300) + 50,
        currency: 'USD',
        roomsAvailable: Math.floor(Math.random() * 5) + 1,
        lastUpdate: new Date().toISOString()
      };

      // Cache for 5 minutes
      await setCache(cacheKey, availability, CACHE_TTL.ROOM_AVAILABILITY);
      
      return availability;
    } catch (error) {
      logger.error('Error getting hotel availability:', error);
      throw error;
    }
  }

  // Get available filters for a destination
  async getAvailableFilters(destination) {
    try {
      const query = destination ? {
        bool: {
          should: [
            { match: { 'location.city': destination } },
            { match: { 'location.district': destination } }
          ]
        }
      } : { match_all: {} };

      const aggregations = {
        categories: { terms: { field: 'category', size: 10 } },
        starRatings: { terms: { field: 'starRating', size: 5 } },
        amenities: { terms: { field: 'amenities', size: 20 } },
        priceRanges: {
          histogram: {
            field: 'priceRange.min',
            interval: 50,
            min_doc_count: 1
          }
        }
      };

      const response = await this.esClient.search({
        index: HOTEL_INDEX,
        body: {
          query,
          size: 0,
          aggs: aggregations
        }
      });

      return {
        categories: response.body.aggregations.categories.buckets,
        starRatings: response.body.aggregations.starRatings.buckets,
        amenities: response.body.aggregations.amenities.buckets,
        priceRanges: response.body.aggregations.priceRanges.buckets
      };
    } catch (error) {
      logger.error('Error getting available filters:', error);
      return {};
    }
  }

  // Utility methods
  generateSearchCacheKey(searchParams) {
    const keyParts = [
      CACHE_KEYS.SEARCH,
      searchParams.destination || 'all',
      searchParams.checkIn || '',
      searchParams.checkOut || '',
      JSON.stringify(searchParams.guests || {}),
      JSON.stringify(searchParams.filters || {}),
      JSON.stringify(searchParams.sorting || {}),
      searchParams.page || 1,
      searchParams.limit || 20
    ];
    return keyParts.join(':');
  }

  async findDuplicateHotel(hotel) {
    try {
      const response = await this.esClient.search({
        index: HOTEL_INDEX,
        body: {
          query: {
            bool: {
              must: [
                { match: { name: hotel.name } },
                { term: { 'location.city': hotel.location.city } }
              ]
            }
          },
          size: 1
        }
      });

      return response.body.hits.hits.length > 0;
    } catch (error) {
      logger.error('Error checking for duplicate hotel:', error);
      return false;
    }
  }

  async invalidateSearchCaches(city) {
    try {
      const pattern = `${CACHE_KEYS.SEARCH}*${city}*`;
      // This would use Redis SCAN in production
      logger.info(`Invalidating search caches for city: ${city}`);
    } catch (error) {
      logger.error('Error invalidating search caches:', error);
    }
  }

  async publishSearchEvent(searchParams, totalResults) {
    try {
      const eventData = {
        destination: searchParams.destination,
        checkIn: searchParams.checkIn,
        checkOut: searchParams.checkOut,
        guests: searchParams.guests,
        filters: searchParams.filters,
        totalResults,
        timestamp: new Date().toISOString()
      };

      await publishHotelEvent(EVENT_TYPES.SEARCH_PERFORMED, eventData);
    } catch (error) {
      logger.error('Error publishing search event:', error);
    }
  }

  isCoordinates(str) {
    return /^-?\d+\.?\d*,-?\d+\.?\d*$/.test(str);
  }

  // External API integration methods
  async syncWithExternalAPIs(hotelId) {
    try {
      const hotel = await this.getHotelById(hotelId);
      if (!hotel) {
        throw new Error('Hotel not found');
      }

      // Sync with Booking.com
      if (this.externalAPIs.bookingCom) {
        await this.syncWithBookingCom(hotel);
      }

      // Sync with Expedia
      if (this.externalAPIs.expedia) {
        await this.syncWithExpedia(hotel);
      }

      logger.info(`Successfully synced hotel ${hotelId} with external APIs`);
      return true;
    } catch (error) {
      logger.error('Error syncing with external APIs:', error);
      throw error;
    }
  }

  async syncWithBookingCom(hotel) {
    // Implementation would integrate with Booking.com API
    logger.info('Syncing with Booking.com API');
  }

  async syncWithExpedia(hotel) {
    // Implementation would integrate with Expedia API
    logger.info('Syncing with Expedia API');
  }
}

module.exports = HotelService;