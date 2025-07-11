const Flight = require('../models/Flight')
const redis = require('../config/redis')
const kafka = require('../config/kafka')
const database = require('../config/database')
const logger = require('../config/logger')
const AmadeusService = require('./AmadeusService')
const SabreService = require('./SabreService')

/**
 * Flight Service - Core business logic for flight operations
 */
class FlightService {
  constructor() {
    this.providers = {
      amadeus: new AmadeusService(),
      sabre: new SabreService()
    }
    this.cacheTimeout = 300 // 5 minutes cache
  }

  /**
   * Search for flights based on criteria
   */
  async searchFlights(searchCriteria) {
    try {
      const {
        from,
        to,
        departureDate,
        returnDate,
        passengers = 1,
        cabinClass = 'economy',
        directFlights = false,
        maxStops = 2,
        airlines = [],
        maxPrice = null,
        currency = 'USD'
      } = searchCriteria

      // Generate cache key
      const cacheKey = this.generateCacheKey('flight_search', searchCriteria)
      
      // Check cache first
      const cachedResults = await this.getCachedResults(cacheKey)
      if (cachedResults) {
        logger.info('Returning cached flight search results')
        return cachedResults
      }

      // Search across multiple providers in parallel
      const searchPromises = Object.entries(this.providers).map(([providerName, provider]) => 
        this.searchWithProvider(provider, searchCriteria, providerName)
      )

      const providerResults = await Promise.allSettled(searchPromises)
      
      // Combine and process results
      const allFlights = []
      providerResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allFlights.push(...result.value)
        } else {
          const providerName = Object.keys(this.providers)[index]
          logger.error(`Provider ${providerName} search failed:`, result.reason)
        }
      })

      // Filter, sort, and rank flights
      const processedFlights = await this.processSearchResults(allFlights, searchCriteria)
      
      // Cache results
      await this.cacheResults(cacheKey, processedFlights, this.cacheTimeout)
      
      // Track search metrics
      await this.trackSearchMetrics(searchCriteria, processedFlights.length)

      return {
        searchId: cacheKey,
        criteria: searchCriteria,
        results: processedFlights,
        totalResults: processedFlights.length,
        searchTime: new Date().toISOString(),
        providers: Object.keys(this.providers),
        metadata: {
          currency,
          passengerCount: passengers,
          roundTrip: !!returnDate
        }
      }

    } catch (error) {
      logger.error('Flight search error:', error)
      throw new Error('Failed to search flights')
    }
  }

  /**
   * Search with a specific provider
   */
  async searchWithProvider(provider, criteria, providerName) {
    try {
      const results = await provider.searchFlights(criteria)
      return results.map(flight => {
        flight.providerId = providerName
        return new Flight(flight)
      })
    } catch (error) {
      logger.error(`${providerName} provider error:`, error)
      return []
    }
  }

  /**
   * Process and enhance search results
   */
  async processSearchResults(flights, criteria) {
    // Remove duplicates based on flight number and departure time
    const uniqueFlights = this.removeDuplicateFlights(flights)
    
    // Apply filters
    let filteredFlights = uniqueFlights
    
    if (criteria.directFlights) {
      filteredFlights = filteredFlights.filter(f => f.isDirect())
    }
    
    if (criteria.maxStops !== undefined) {
      filteredFlights = filteredFlights.filter(f => f.stops <= criteria.maxStops)
    }
    
    if (criteria.airlines.length > 0) {
      filteredFlights = filteredFlights.filter(f => 
        criteria.airlines.includes(f.airlineCode)
      )
    }
    
    if (criteria.maxPrice) {
      filteredFlights = filteredFlights.filter(f => 
        f.calculateTotalPrice(criteria.cabinClass, criteria.passengers).total <= criteria.maxPrice
      )
    }

    // Enhance with additional data
    for (const flight of filteredFlights) {
      await this.enhanceFlightData(flight)
    }
    
    // Sort by relevance/price
    filteredFlights.sort((a, b) => {
      const scoreA = this.calculateRelevanceScore(a, criteria)
      const scoreB = this.calculateRelevanceScore(b, criteria)
      return scoreB - scoreA // Higher score first
    })
    
    return filteredFlights.slice(0, 50) // Limit to top 50 results
  }

  /**
   * Remove duplicate flights
   */
  removeDuplicateFlights(flights) {
    const seen = new Set()
    return flights.filter(flight => {
      const key = `${flight.flightNumber}-${flight.departureTime}-${flight.departureAirport}-${flight.arrivalAirport}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  /**
   * Calculate relevance score for sorting
   */
  calculateRelevanceScore(flight, criteria) {
    let score = 0
    
    // Price factor (lower price = higher score)
    const price = flight.calculateTotalPrice(criteria.cabinClass, criteria.passengers).total
    score += Math.max(0, 1000 - price) / 10
    
    // Direct flight bonus
    if (flight.isDirect()) {
      score += 100
    }
    
    // Duration factor (shorter = better)
    score += Math.max(0, 600 - flight.duration) / 5
    
    // Departure time preference (mid-day flights preferred)
    const hour = new Date(flight.departureTime).getHours()
    if (hour >= 9 && hour <= 18) {
      score += 50
    }
    
    // Airline reputation (simplified)
    const premiumAirlines = ['AA', 'DL', 'UA', 'LH', 'BA', 'AF', 'KL']
    if (premiumAirlines.includes(flight.airlineCode)) {
      score += 30
    }
    
    // Environmental factor
    if (flight.getEnvironmentalImpact() === 'LOW') {
      score += 20
    }
    
    return score
  }

  /**
   * Enhance flight data with additional information
   */
  async enhanceFlightData(flight) {
    try {
      // Add real-time status if available
      const status = await this.getFlightStatus(flight.flightNumber, flight.departureTime)
      if (status) {
        flight.status = status.status
        flight.delay = status.delay
        flight.actualDepartureTime = status.actualDepartureTime
        flight.actualArrivalTime = status.actualArrivalTime
      }
      
      // Add historical on-time performance
      const performance = await this.getOnTimePerformance(flight.flightNumber)
      if (performance) {
        flight.onTimePerformance = performance
      }
      
      // Add seat maps if available
      const seatMap = await this.getSeatMap(flight.flightNumber, flight.departureTime)
      if (seatMap) {
        flight.seatMap = seatMap
      }
      
    } catch (error) {
      logger.warn('Failed to enhance flight data:', error.message)
    }
  }

  /**
   * Get flight details by ID
   */
  async getFlightById(flightId) {
    try {
      // Check cache first
      const cacheKey = `flight_details:${flightId}`
      const cached = await redis.get(cacheKey)
      if (cached) {
        return new Flight(JSON.parse(cached))
      }
      
      // Query database
      const query = `
        SELECT * FROM flights 
        WHERE id = $1 AND status = 'SCHEDULED'
      `
      const result = await database.query(query, [flightId])
      
      if (result.rows.length === 0) {
        throw new Error('Flight not found')
      }
      
      const flight = new Flight(result.rows[0])
      
      // Cache the result
      await redis.setex(cacheKey, 300, JSON.stringify(flight))
      
      return flight
    } catch (error) {
      logger.error('Get flight by ID error:', error)
      throw error
    }
  }

  /**
   * Check seat availability for a specific flight
   */
  async checkSeatAvailability(flightId, cabinClass, seatsRequired) {
    try {
      const flight = await this.getFlightById(flightId)
      return flight.checkAvailability(cabinClass, seatsRequired)
    } catch (error) {
      logger.error('Check seat availability error:', error)
      throw error
    }
  }

  /**
   * Create a flight booking hold/reservation
   */
  async createBookingHold(flightId, bookingDetails) {
    try {
      const {
        userId,
        cabinClass,
        passengers,
        contactInfo,
        holdDuration = 15 // minutes
      } = bookingDetails

      const flight = await this.getFlightById(flightId)
      
      // Check availability
      if (!flight.checkAvailability(cabinClass, passengers.length)) {
        throw new Error('Insufficient seat availability')
      }
      
      // Create booking hold
      const holdId = `hold_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const holdData = {
        holdId,
        flightId,
        userId,
        cabinClass,
        passengers,
        contactInfo,
        pricing: flight.calculateTotalPrice(cabinClass, passengers.length),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + holdDuration * 60 * 1000),
        status: 'HELD'
      }
      
      // Store hold in Redis with expiration
      await redis.setex(
        `booking_hold:${holdId}`, 
        holdDuration * 60, 
        JSON.stringify(holdData)
      )
      
      // Temporarily reserve seats
      await this.reserveSeats(flightId, cabinClass, passengers.length)
      
      // Publish booking hold event
      await this.publishEvent('booking.hold.created', {
        holdId,
        flightId,
        userId,
        passengers: passengers.length,
        amount: holdData.pricing.total,
        expiresAt: holdData.expiresAt
      })
      
      logger.info(`Booking hold created: ${holdId}`)
      
      return holdData
      
    } catch (error) {
      logger.error('Create booking hold error:', error)
      throw error
    }
  }

  /**
   * Confirm booking (convert hold to booking)
   */
  async confirmBooking(holdId, paymentInfo) {
    try {
      // Get hold details
      const holdData = await redis.get(`booking_hold:${holdId}`)
      if (!holdData) {
        throw new Error('Booking hold not found or expired')
      }
      
      const hold = JSON.parse(holdData)
      
      // Validate hold is still valid
      if (new Date() > new Date(hold.expiresAt)) {
        throw new Error('Booking hold has expired')
      }
      
      // Create confirmed booking
      const bookingId = `BK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const booking = {
        bookingId,
        holdId,
        flightId: hold.flightId,
        userId: hold.userId,
        cabinClass: hold.cabinClass,
        passengers: hold.passengers,
        contactInfo: hold.contactInfo,
        pricing: hold.pricing,
        paymentInfo,
        status: 'CONFIRMED',
        bookedAt: new Date(),
        pnr: this.generatePNR()
      }
      
      // Store booking in database
      await this.saveBooking(booking)
      
      // Remove hold
      await redis.del(`booking_hold:${holdId}`)
      
      // Publish booking confirmed event
      await this.publishEvent('booking.confirmed', {
        bookingId,
        flightId: booking.flightId,
        userId: booking.userId,
        pnr: booking.pnr,
        amount: booking.pricing.total,
        passengers: booking.passengers.length
      })
      
      logger.info(`Booking confirmed: ${bookingId}`)
      
      return booking
      
    } catch (error) {
      logger.error('Confirm booking error:', error)
      throw error
    }
  }

  /**
   * Cancel booking hold
   */
  async cancelBookingHold(holdId) {
    try {
      const holdData = await redis.get(`booking_hold:${holdId}`)
      if (!holdData) {
        return false
      }
      
      const hold = JSON.parse(holdData)
      
      // Release reserved seats
      await this.releaseSeats(hold.flightId, hold.cabinClass, hold.passengers.length)
      
      // Remove hold
      await redis.del(`booking_hold:${holdId}`)
      
      // Publish hold cancelled event
      await this.publishEvent('booking.hold.cancelled', {
        holdId,
        flightId: hold.flightId,
        userId: hold.userId
      })
      
      return true
      
    } catch (error) {
      logger.error('Cancel booking hold error:', error)
      throw error
    }
  }

  /**
   * Get flight status
   */
  async getFlightStatus(flightNumber, date) {
    try {
      // Try to get real-time status from providers
      for (const provider of Object.values(this.providers)) {
        try {
          const status = await provider.getFlightStatus(flightNumber, date)
          if (status) {
            return status
          }
        } catch (error) {
          // Continue to next provider
        }
      }
      
      return null
    } catch (error) {
      logger.error('Get flight status error:', error)
      return null
    }
  }

  /**
   * Reserve seats for a flight
   */
  async reserveSeats(flightId, cabinClass, seatsRequired) {
    const query = `
      UPDATE flights 
      SET available_seats = available_seats - $1,
          ${cabinClass}_available = ${cabinClass}_available - $1,
          updated_at = NOW()
      WHERE id = $2 AND ${cabinClass}_available >= $1
      RETURNING *
    `
    
    const result = await database.query(query, [seatsRequired, flightId])
    
    if (result.rows.length === 0) {
      throw new Error('Failed to reserve seats - insufficient availability')
    }
    
    return result.rows[0]
  }

  /**
   * Release reserved seats
   */
  async releaseSeats(flightId, cabinClass, seatsToRelease) {
    const query = `
      UPDATE flights 
      SET available_seats = available_seats + $1,
          ${cabinClass}_available = ${cabinClass}_available + $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `
    
    const result = await database.query(query, [seatsToRelease, flightId])
    return result.rows[0]
  }

  /**
   * Save booking to database
   */
  async saveBooking(booking) {
    const query = `
      INSERT INTO bookings (
        booking_id, flight_id, user_id, cabin_class, passengers, 
        contact_info, pricing, payment_info, status, pnr, booked_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `
    
    const values = [
      booking.bookingId,
      booking.flightId,
      booking.userId,
      booking.cabinClass,
      JSON.stringify(booking.passengers),
      JSON.stringify(booking.contactInfo),
      JSON.stringify(booking.pricing),
      JSON.stringify(booking.paymentInfo),
      booking.status,
      booking.pnr,
      booking.bookedAt
    ]
    
    const result = await database.query(query, values)
    return result.rows[0]
  }

  /**
   * Generate cache key
   */
  generateCacheKey(prefix, data) {
    const hash = require('crypto')
      .createHash('md5')
      .update(JSON.stringify(data))
      .digest('hex')
    return `${prefix}:${hash}`
  }

  /**
   * Get cached results
   */
  async getCachedResults(cacheKey) {
    try {
      const cached = await redis.get(cacheKey)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      logger.warn('Cache get error:', error)
      return null
    }
  }

  /**
   * Cache results
   */
  async cacheResults(cacheKey, data, ttl) {
    try {
      await redis.setex(cacheKey, ttl, JSON.stringify(data))
    } catch (error) {
      logger.warn('Cache set error:', error)
    }
  }

  /**
   * Generate PNR (Passenger Name Record)
   */
  generatePNR() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  /**
   * Publish Kafka event
   */
  async publishEvent(eventType, data) {
    try {
      await kafka.send('flight_events', {
        eventType,
        data,
        timestamp: new Date().toISOString(),
        service: 'flight-service'
      })
    } catch (error) {
      logger.error('Failed to publish event:', error)
    }
  }

  /**
   * Track search metrics
   */
  async trackSearchMetrics(criteria, resultCount) {
    try {
      await this.publishEvent('flight.search.completed', {
        searchCriteria: criteria,
        resultCount,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.warn('Failed to track search metrics:', error)
    }
  }

  /**
   * Get on-time performance data
   */
  async getOnTimePerformance(flightNumber) {
    try {
      const cacheKey = `otp:${flightNumber}`
      const cached = await redis.get(cacheKey)
      
      if (cached) {
        return JSON.parse(cached)
      }
      
      // In a real implementation, this would query historical data
      const performance = {
        onTimePercentage: Math.floor(Math.random() * 30) + 70, // 70-100%
        averageDelay: Math.floor(Math.random() * 20), // 0-20 minutes
        lastUpdated: new Date().toISOString()
      }
      
      await redis.setex(cacheKey, 3600, JSON.stringify(performance))
      return performance
      
    } catch (error) {
      logger.warn('Failed to get on-time performance:', error)
      return null
    }
  }

  /**
   * Get seat map for flight
   */
  async getSeatMap(flightNumber, date) {
    try {
      // In a real implementation, this would fetch actual seat maps
      // from airline APIs or cached data
      return null
    } catch (error) {
      logger.warn('Failed to get seat map:', error)
      return null
    }
  }
}

module.exports = FlightService