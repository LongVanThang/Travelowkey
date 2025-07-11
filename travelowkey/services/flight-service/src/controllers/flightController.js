const FlightService = require('../services/FlightService')
const { validationResult } = require('express-validator')
const logger = require('../config/logger')

/**
 * Flight Controller - Handles HTTP requests for flight operations
 */
class FlightController {
  constructor() {
    this.flightService = new FlightService()
  }

  /**
   * Search for flights
   * POST /api/v1/flights/search
   */
  async searchFlights(req, res, next) {
    try {
      // Check validation errors
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation Error',
          details: errors.array()
        })
      }

      const searchCriteria = {
        from: req.body.from,
        to: req.body.to,
        departureDate: req.body.departureDate,
        returnDate: req.body.returnDate,
        passengers: req.body.passengers || 1,
        cabinClass: req.body.cabinClass || 'economy',
        directFlights: req.body.directFlights || false,
        maxStops: req.body.maxStops || 2,
        airlines: req.body.airlines || [],
        maxPrice: req.body.maxPrice,
        currency: req.body.currency || 'USD'
      }

      logger.info('Flight search request:', {
        userId: req.userId,
        criteria: searchCriteria
      })

      const results = await this.flightService.searchFlights(searchCriteria)

      res.json({
        success: true,
        data: results,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      logger.error('Flight search error:', error)
      next(error)
    }
  }

  /**
   * Get flight details by ID
   * GET /api/v1/flights/:id
   */
  async getFlightById(req, res, next) {
    try {
      const { id } = req.params

      const flight = await this.flightService.getFlightById(id)

      res.json({
        success: true,
        data: flight.toJSON(),
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      if (error.message === 'Flight not found') {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Flight not found'
        })
      }
      logger.error('Get flight by ID error:', error)
      next(error)
    }
  }

  /**
   * Check seat availability
   * GET /api/v1/flights/:id/availability
   */
  async checkAvailability(req, res, next) {
    try {
      const { id } = req.params
      const { cabinClass = 'economy', passengers = 1 } = req.query

      const available = await this.flightService.checkSeatAvailability(
        id, 
        cabinClass, 
        parseInt(passengers)
      )

      res.json({
        success: true,
        data: {
          flightId: id,
          cabinClass,
          seatsRequested: parseInt(passengers),
          available
        },
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      logger.error('Check availability error:', error)
      next(error)
    }
  }

  /**
   * Create booking hold
   * POST /api/v1/flights/:id/hold
   */
  async createBookingHold(req, res, next) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation Error',
          details: errors.array()
        })
      }

      const { id: flightId } = req.params
      const bookingDetails = {
        userId: req.userId,
        cabinClass: req.body.cabinClass,
        passengers: req.body.passengers,
        contactInfo: req.body.contactInfo,
        holdDuration: req.body.holdDuration || 15
      }

      logger.info('Creating booking hold:', {
        userId: req.userId,
        flightId,
        cabinClass: bookingDetails.cabinClass,
        passengerCount: bookingDetails.passengers.length
      })

      const hold = await this.flightService.createBookingHold(flightId, bookingDetails)

      res.status(201).json({
        success: true,
        data: hold,
        message: 'Booking hold created successfully',
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      if (error.message.includes('Insufficient seat availability')) {
        return res.status(400).json({
          error: 'Unavailable',
          message: 'Insufficient seat availability for requested cabin class'
        })
      }
      logger.error('Create booking hold error:', error)
      next(error)
    }
  }

  /**
   * Confirm booking
   * POST /api/v1/flights/holds/:holdId/confirm
   */
  async confirmBooking(req, res, next) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation Error',
          details: errors.array()
        })
      }

      const { holdId } = req.params
      const paymentInfo = req.body.paymentInfo

      logger.info('Confirming booking:', {
        userId: req.userId,
        holdId
      })

      const booking = await this.flightService.confirmBooking(holdId, paymentInfo)

      res.json({
        success: true,
        data: booking,
        message: 'Booking confirmed successfully',
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('expired')) {
        return res.status(400).json({
          error: 'Invalid Hold',
          message: error.message
        })
      }
      logger.error('Confirm booking error:', error)
      next(error)
    }
  }

  /**
   * Cancel booking hold
   * DELETE /api/v1/flights/holds/:holdId
   */
  async cancelBookingHold(req, res, next) {
    try {
      const { holdId } = req.params

      logger.info('Cancelling booking hold:', {
        userId: req.userId,
        holdId
      })

      const cancelled = await this.flightService.cancelBookingHold(holdId)

      if (!cancelled) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Booking hold not found'
        })
      }

      res.json({
        success: true,
        message: 'Booking hold cancelled successfully',
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      logger.error('Cancel booking hold error:', error)
      next(error)
    }
  }

  /**
   * Get flight status
   * GET /api/v1/flights/:flightNumber/status
   */
  async getFlightStatus(req, res, next) {
    try {
      const { flightNumber } = req.params
      const { date } = req.query

      if (!date) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Date parameter is required'
        })
      }

      const status = await this.flightService.getFlightStatus(flightNumber, date)

      if (!status) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Flight status not available'
        })
      }

      res.json({
        success: true,
        data: status,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      logger.error('Get flight status error:', error)
      next(error)
    }
  }

  /**
   * Get popular destinations
   * GET /api/v1/flights/destinations/popular
   */
  async getPopularDestinations(req, res, next) {
    try {
      const { from, limit = 10 } = req.query

      // In a real implementation, this would query analytics data
      const popularDestinations = [
        { code: 'JFK', city: 'New York', country: 'USA', popularity: 95 },
        { code: 'LAX', city: 'Los Angeles', country: 'USA', popularity: 90 },
        { code: 'LHR', city: 'London', country: 'UK', popularity: 88 },
        { code: 'CDG', city: 'Paris', country: 'France', popularity: 85 },
        { code: 'NRT', city: 'Tokyo', country: 'Japan', popularity: 82 },
        { code: 'DXB', city: 'Dubai', country: 'UAE', popularity: 80 },
        { code: 'SIN', city: 'Singapore', country: 'Singapore', popularity: 78 },
        { code: 'HKG', city: 'Hong Kong', country: 'Hong Kong', popularity: 75 },
        { code: 'SYD', city: 'Sydney', country: 'Australia', popularity: 72 },
        { code: 'BKK', city: 'Bangkok', country: 'Thailand', popularity: 70 }
      ]

      res.json({
        success: true,
        data: popularDestinations.slice(0, parseInt(limit)),
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      logger.error('Get popular destinations error:', error)
      next(error)
    }
  }

  /**
   * Get airlines
   * GET /api/v1/flights/airlines
   */
  async getAirlines(req, res, next) {
    try {
      // In a real implementation, this would query a database
      const airlines = [
        { code: 'AA', name: 'American Airlines', country: 'USA' },
        { code: 'DL', name: 'Delta Air Lines', country: 'USA' },
        { code: 'UA', name: 'United Airlines', country: 'USA' },
        { code: 'LH', name: 'Lufthansa', country: 'Germany' },
        { code: 'BA', name: 'British Airways', country: 'UK' },
        { code: 'AF', name: 'Air France', country: 'France' },
        { code: 'KL', name: 'KLM', country: 'Netherlands' },
        { code: 'EK', name: 'Emirates', country: 'UAE' },
        { code: 'QR', name: 'Qatar Airways', country: 'Qatar' },
        { code: 'SQ', name: 'Singapore Airlines', country: 'Singapore' }
      ]

      res.json({
        success: true,
        data: airlines,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      logger.error('Get airlines error:', error)
      next(error)
    }
  }

  /**
   * Get airports by search term
   * GET /api/v1/flights/airports/search
   */
  async searchAirports(req, res, next) {
    try {
      const { q: searchTerm, limit = 10 } = req.query

      if (!searchTerm || searchTerm.length < 2) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Search term must be at least 2 characters'
        })
      }

      // In a real implementation, this would search a comprehensive airport database
      const airports = [
        { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'USA' },
        { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'USA' },
        { code: 'LHR', name: 'London Heathrow Airport', city: 'London', country: 'UK' },
        { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France' },
        { code: 'NRT', name: 'Narita International Airport', city: 'Tokyo', country: 'Japan' },
        { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'UAE' },
        { code: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore' },
        { code: 'HKG', name: 'Hong Kong International Airport', city: 'Hong Kong', country: 'Hong Kong' },
        { code: 'SYD', name: 'Sydney Kingsford Smith Airport', city: 'Sydney', country: 'Australia' },
        { code: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'Thailand' }
      ]

      const filtered = airports.filter(airport =>
        airport.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        airport.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        airport.city.toLowerCase().includes(searchTerm.toLowerCase())
      )

      res.json({
        success: true,
        data: filtered.slice(0, parseInt(limit)),
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      logger.error('Search airports error:', error)
      next(error)
    }
  }

  /**
   * Get flight price trends
   * GET /api/v1/flights/price-trends
   */
  async getPriceTrends(req, res, next) {
    try {
      const { from, to, period = '30d' } = req.query

      if (!from || !to) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'From and to parameters are required'
        })
      }

      // In a real implementation, this would query historical pricing data
      const trends = {
        route: `${from}-${to}`,
        period,
        averagePrice: 450,
        lowestPrice: 320,
        highestPrice: 680,
        recommendation: 'BOOK_NOW', // BOOK_NOW, WAIT, NEUTRAL
        priceHistory: [
          { date: '2024-01-01', price: 420 },
          { date: '2024-01-02', price: 435 },
          { date: '2024-01-03', price: 445 },
          { date: '2024-01-04', price: 460 },
          { date: '2024-01-05', price: 450 }
        ]
      }

      res.json({
        success: true,
        data: trends,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      logger.error('Get price trends error:', error)
      next(error)
    }
  }
}

module.exports = FlightController