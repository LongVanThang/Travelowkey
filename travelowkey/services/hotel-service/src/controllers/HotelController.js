const HotelService = require('../services/HotelService');
const { body, query, param, validationResult } = require('express-validator');
const logger = require('../utils/logger');

class HotelController {
  constructor() {
    this.hotelService = new HotelService();
    this.hotelService.initialize();
  }

  /**
   * @swagger
   * /api/search:
   *   post:
   *     summary: Search hotels with filters
   *     tags: [Hotels]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SearchRequest'
   *     responses:
   *       200:
   *         description: Search results
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SearchResponse'
   */
  async searchHotels(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const searchParams = req.body;
      const results = await this.hotelService.searchHotels(searchParams);

      res.json({
        success: true,
        data: results,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error in searchHotels controller:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * @swagger
   * /api/hotels:
   *   get:
   *     summary: Get all hotels with pagination
   *     tags: [Hotels]
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *       - in: query
   *         name: city
   *         schema:
   *           type: string
   *       - in: query
   *         name: category
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: List of hotels
   */
  async getAllHotels(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { page = 1, limit = 20, city, category, starRating } = req.query;
      
      const searchParams = {
        destination: city,
        filters: {
          category,
          starRating: starRating ? [parseInt(starRating)] : undefined
        },
        page: parseInt(page),
        limit: parseInt(limit)
      };

      const results = await this.hotelService.searchHotels(searchParams);

      res.json({
        success: true,
        data: results,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error in getAllHotels controller:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * @swagger
   * /api/hotels/{id}:
   *   get:
   *     summary: Get hotel by ID
   *     tags: [Hotels]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Hotel details
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Hotel'
   *       404:
   *         description: Hotel not found
   */
  async getHotelById(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const hotel = await this.hotelService.getHotelById(id);

      if (!hotel) {
        return res.status(404).json({
          error: 'Hotel not found',
          message: `Hotel with ID ${id} does not exist`
        });
      }

      res.json({
        success: true,
        data: hotel,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error in getHotelById controller:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * @swagger
   * /api/hotels:
   *   post:
   *     summary: Create a new hotel
   *     tags: [Hotels]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Hotel'
   *     responses:
   *       201:
   *         description: Hotel created successfully
   *       400:
   *         description: Validation error
   */
  async createHotel(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const hotelData = req.body;
      const hotel = await this.hotelService.createHotel(hotelData);

      res.status(201).json({
        success: true,
        data: hotel,
        message: 'Hotel created successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error in createHotel controller:', error);
      
      if (error.message.includes('Validation failed') || 
          error.message.includes('already exists')) {
        return res.status(400).json({
          error: 'Bad request',
          message: error.message
        });
      }

      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * @swagger
   * /api/hotels/{id}:
   *   put:
   *     summary: Update hotel
   *     tags: [Hotels]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Hotel'
   *     responses:
   *       200:
   *         description: Hotel updated successfully
   *       404:
   *         description: Hotel not found
   */
  async updateHotel(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const updateData = req.body;
      
      const hotel = await this.hotelService.updateHotel(id, updateData);

      res.json({
        success: true,
        data: hotel,
        message: 'Hotel updated successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error in updateHotel controller:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Hotel not found',
          message: error.message
        });
      }

      if (error.message.includes('Validation failed')) {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.message
        });
      }

      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * @swagger
   * /api/hotels/{id}:
   *   delete:
   *     summary: Delete hotel
   *     tags: [Hotels]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Hotel deleted successfully
   *       404:
   *         description: Hotel not found
   */
  async deleteHotel(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { id } = req.params;
      await this.hotelService.deleteHotel(id);

      res.json({
        success: true,
        message: 'Hotel deleted successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error in deleteHotel controller:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Hotel not found',
          message: error.message
        });
      }

      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * @swagger
   * /api/hotels/{id}/sync:
   *   post:
   *     summary: Sync hotel with external APIs
   *     tags: [Hotels]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Sync completed successfully
   */
  async syncHotelWithExternalAPIs(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { id } = req.params;
      await this.hotelService.syncWithExternalAPIs(id);

      res.json({
        success: true,
        message: 'Hotel synced with external APIs successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error in syncHotelWithExternalAPIs controller:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Hotel not found',
          message: error.message
        });
      }

      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * @swagger
   * /api/search/suggestions:
   *   get:
   *     summary: Get search suggestions
   *     tags: [Search]
   *     parameters:
   *       - in: query
   *         name: q
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 5
   *     responses:
   *       200:
   *         description: Search suggestions
   */
  async getSearchSuggestions(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { q, limit = 5 } = req.query;
      
      // Simple autocomplete implementation
      const searchParams = {
        destination: q,
        page: 1,
        limit: parseInt(limit)
      };

      const results = await this.hotelService.searchHotels(searchParams);
      
      const suggestions = results.hotels.map(hotel => ({
        id: hotel.id,
        name: hotel.name,
        city: hotel.location.city,
        country: hotel.location.country,
        type: 'hotel'
      }));

      res.json({
        success: true,
        data: suggestions,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error in getSearchSuggestions controller:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * @swagger
   * /api/hotels/filters:
   *   get:
   *     summary: Get available filters for destination
   *     tags: [Hotels]
   *     parameters:
   *       - in: query
   *         name: destination
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Available filters
   */
  async getAvailableFilters(req, res) {
    try {
      const { destination } = req.query;
      const filters = await this.hotelService.getAvailableFilters(destination);

      res.json({
        success: true,
        data: filters,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error in getAvailableFilters controller:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Validation middleware factories
  static validateSearchRequest() {
    return [
      body('destination').optional().isString().trim(),
      body('checkIn').optional().isISO8601().toDate(),
      body('checkOut').optional().isISO8601().toDate(),
      body('guests.adults').optional().isInt({ min: 1, max: 10 }),
      body('guests.children').optional().isInt({ min: 0, max: 10 }),
      body('guests.rooms').optional().isInt({ min: 1, max: 5 }),
      body('filters.priceRange.min').optional().isFloat({ min: 0 }),
      body('filters.priceRange.max').optional().isFloat({ min: 0 }),
      body('filters.starRating').optional().isArray(),
      body('filters.guestRating').optional().isFloat({ min: 0, max: 10 }),
      body('filters.category').optional().isIn(['budget', 'mid-range', 'luxury', 'boutique', 'resort']),
      body('sorting.sortBy').optional().isIn(['price', 'rating', 'distance', 'popularity', 'relevance']),
      body('sorting.sortOrder').optional().isIn(['asc', 'desc']),
      body('page').optional().isInt({ min: 1 }),
      body('limit').optional().isInt({ min: 1, max: 100 })
    ];
  }

  static validateHotelId() {
    return [
      param('id').isString().notEmpty().withMessage('Hotel ID is required')
    ];
  }

  static validateCreateHotel() {
    return [
      body('name').isString().notEmpty().withMessage('Hotel name is required'),
      body('location.city').isString().notEmpty().withMessage('City is required'),
      body('location.country').isString().notEmpty().withMessage('Country is required'),
      body('location.coordinates.lat').optional().isFloat({ min: -90, max: 90 }),
      body('location.coordinates.lon').optional().isFloat({ min: -180, max: 180 }),
      body('category').isIn(['budget', 'mid-range', 'luxury', 'boutique', 'resort']),
      body('starRating').isFloat({ min: 1, max: 5 }),
      body('guestRating').optional().isFloat({ min: 0, max: 10 }),
      body('priceRange.currency').optional().isLength({ min: 3, max: 3 })
    ];
  }

  static validateUpdateHotel() {
    return [
      param('id').isString().notEmpty().withMessage('Hotel ID is required'),
      body('name').optional().isString().notEmpty(),
      body('location.city').optional().isString().notEmpty(),
      body('location.country').optional().isString().notEmpty(),
      body('category').optional().isIn(['budget', 'mid-range', 'luxury', 'boutique', 'resort']),
      body('starRating').optional().isFloat({ min: 1, max: 5 }),
      body('guestRating').optional().isFloat({ min: 0, max: 10 })
    ];
  }

  static validatePagination() {
    return [
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
      query('city').optional().isString().trim(),
      query('category').optional().isIn(['budget', 'mid-range', 'luxury', 'boutique', 'resort']),
      query('starRating').optional().isInt({ min: 1, max: 5 }).toInt()
    ];
  }

  static validateSearchSuggestions() {
    return [
      query('q').isString().notEmpty().withMessage('Search query is required'),
      query('limit').optional().isInt({ min: 1, max: 20 }).toInt()
    ];
  }
}

module.exports = HotelController;