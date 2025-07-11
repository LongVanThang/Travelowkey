const { v4: uuidv4 } = require('uuid')

/**
 * Flight model representing flight information and availability
 */
class Flight {
  constructor(data = {}) {
    this.id = data.id || uuidv4()
    this.flightNumber = data.flightNumber
    this.airlineCode = data.airlineCode
    this.airlineName = data.airlineName
    
    // Route information
    this.departureAirport = data.departureAirport
    this.arrivalAirport = data.arrivalAirport
    this.departureCity = data.departureCity
    this.arrivalCity = data.arrivalCity
    this.departureCountry = data.departureCountry
    this.arrivalCountry = data.arrivalCountry
    
    // Schedule
    this.departureTime = data.departureTime
    this.arrivalTime = data.arrivalTime
    this.duration = data.duration // in minutes
    this.timezone = data.timezone
    
    // Aircraft information
    this.aircraftType = data.aircraftType
    this.aircraftModel = data.aircraftModel
    this.totalSeats = data.totalSeats || 0
    this.availableSeats = data.availableSeats || 0
    
    // Pricing
    this.basePrice = data.basePrice || 0
    this.currency = data.currency || 'USD'
    this.priceBreakdown = data.priceBreakdown || {}
    this.taxes = data.taxes || 0
    this.fees = data.fees || 0
    this.totalPrice = data.totalPrice || (this.basePrice + this.taxes + this.fees)
    
    // Cabin classes and availability
    this.cabinClasses = data.cabinClasses || {
      economy: {
        available: 0,
        price: this.basePrice,
        amenities: ['Standard seat', 'In-flight meal']
      },
      premium: {
        available: 0,
        price: this.basePrice * 1.3,
        amenities: ['Extra legroom', 'Premium meal', 'Priority boarding']
      },
      business: {
        available: 0,
        price: this.basePrice * 2.5,
        amenities: ['Lie-flat seat', 'Premium dining', 'Lounge access']
      },
      first: {
        available: 0,
        price: this.basePrice * 4,
        amenities: ['Private suite', 'Gourmet dining', 'Personal service']
      }
    }
    
    // Flight status
    this.status = data.status || 'SCHEDULED' // SCHEDULED, DELAYED, CANCELLED, BOARDING, DEPARTED, ARRIVED
    this.actualDepartureTime = data.actualDepartureTime
    this.actualArrivalTime = data.actualArrivalTime
    this.delay = data.delay || 0 // in minutes
    
    // Baggage information
    this.baggagePolicy = data.baggagePolicy || {
      carryOn: {
        included: 1,
        weight: 7, // kg
        dimensions: '55x40x20 cm'
      },
      checked: {
        included: 1,
        weight: 23, // kg
        extraFee: 50
      }
    }
    
    // Amenities and services
    this.amenities = data.amenities || []
    this.wifi = data.wifi || false
    this.entertainment = data.entertainment || false
    this.meals = data.meals || false
    this.powerOutlets = data.powerOutlets || false
    
    // Booking information
    this.bookable = data.bookable !== undefined ? data.bookable : true
    this.refundable = data.refundable || false
    this.changeable = data.changeable || true
    this.changeFeesApply = data.changeFeesApply || true
    
    // Metadata
    this.searchId = data.searchId
    this.providerId = data.providerId // Amadeus, Sabre, etc.
    this.lastUpdated = data.lastUpdated || new Date()
    this.validUntil = data.validUntil
    
    // Connections (for multi-leg flights)
    this.connections = data.connections || []
    this.stops = data.stops || 0
    this.layoverDuration = data.layoverDuration || 0 // total layover time in minutes
    
    // Environmental impact
    this.co2Emissions = data.co2Emissions || 0 // kg per passenger
    this.environmentalRating = data.environmentalRating || 'C' // A-F rating
    
    // Booking restrictions
    this.advancePurchaseRequired = data.advancePurchaseRequired || 0 // days
    this.minimumStay = data.minimumStay || 0 // days
    this.maximumStay = data.maximumStay || 365 // days
    this.saturdayNightStay = data.saturdayNightStay || false
    
    // Loyalty program
    this.milesEarned = data.milesEarned || Math.floor(this.basePrice * 0.1)
    this.tierPointsEarned = data.tierPointsEarned || Math.floor(this.basePrice * 0.05)
  }
  
  /**
   * Check if flight is available for booking
   */
  isAvailable() {
    return this.bookable && 
           this.availableSeats > 0 && 
           this.status === 'SCHEDULED' &&
           (!this.validUntil || new Date() < new Date(this.validUntil))
  }
  
  /**
   * Get available cabin classes
   */
  getAvailableCabinClasses() {
    return Object.entries(this.cabinClasses)
      .filter(([, classInfo]) => classInfo.available > 0)
      .map(([className, classInfo]) => ({
        class: className,
        ...classInfo
      }))
  }
  
  /**
   * Calculate price with taxes and fees
   */
  calculateTotalPrice(cabinClass = 'economy', passengers = 1) {
    const basePrice = this.cabinClasses[cabinClass]?.price || this.basePrice
    const subtotal = basePrice * passengers
    const totalTaxes = this.taxes * passengers
    const totalFees = this.fees * passengers
    
    return {
      basePrice: basePrice,
      passengers: passengers,
      subtotal: subtotal,
      taxes: totalTaxes,
      fees: totalFees,
      total: subtotal + totalTaxes + totalFees,
      currency: this.currency
    }
  }
  
  /**
   * Check seat availability for specific cabin class
   */
  checkAvailability(cabinClass, seatsRequired) {
    const classInfo = this.cabinClasses[cabinClass]
    return classInfo && classInfo.available >= seatsRequired
  }
  
  /**
   * Reserve seats (reduce availability)
   */
  reserveSeats(cabinClass, seatsRequired) {
    if (!this.checkAvailability(cabinClass, seatsRequired)) {
      throw new Error(`Insufficient seats available in ${cabinClass} class`)
    }
    
    this.cabinClasses[cabinClass].available -= seatsRequired
    this.availableSeats -= seatsRequired
    this.lastUpdated = new Date()
    
    return true
  }
  
  /**
   * Release reserved seats (increase availability)
   */
  releaseSeats(cabinClass, seatsToRelease) {
    this.cabinClasses[cabinClass].available += seatsToRelease
    this.availableSeats += seatsToRelease
    this.lastUpdated = new Date()
    
    return true
  }
  
  /**
   * Get flight duration in hours and minutes
   */
  getFormattedDuration() {
    const hours = Math.floor(this.duration / 60)
    const minutes = this.duration % 60
    return `${hours}h ${minutes}m`
  }
  
  /**
   * Check if flight is direct (no stops)
   */
  isDirect() {
    return this.stops === 0
  }
  
  /**
   * Get environmental impact level
   */
  getEnvironmentalImpact() {
    const impact = this.co2Emissions
    if (impact < 100) return 'LOW'
    if (impact < 200) return 'MEDIUM'
    return 'HIGH'
  }
  
  /**
   * Get delay status
   */
  getDelayStatus() {
    if (this.delay === 0) return 'ON_TIME'
    if (this.delay <= 15) return 'MINOR_DELAY'
    if (this.delay <= 60) return 'MODERATE_DELAY'
    return 'MAJOR_DELAY'
  }
  
  /**
   * Convert to API response format
   */
  toJSON() {
    return {
      id: this.id,
      flightNumber: this.flightNumber,
      airline: {
        code: this.airlineCode,
        name: this.airlineName
      },
      route: {
        departure: {
          airport: this.departureAirport,
          city: this.departureCity,
          country: this.departureCountry,
          time: this.departureTime,
          actualTime: this.actualDepartureTime
        },
        arrival: {
          airport: this.arrivalAirport,
          city: this.arrivalCity,
          country: this.arrivalCountry,
          time: this.arrivalTime,
          actualTime: this.actualArrivalTime
        }
      },
      duration: {
        total: this.duration,
        formatted: this.getFormattedDuration()
      },
      aircraft: {
        type: this.aircraftType,
        model: this.aircraftModel
      },
      pricing: {
        basePrice: this.basePrice,
        currency: this.currency,
        cabinClasses: this.getAvailableCabinClasses()
      },
      availability: {
        totalSeats: this.totalSeats,
        availableSeats: this.availableSeats,
        bookable: this.isAvailable()
      },
      status: {
        current: this.status,
        delay: this.delay,
        delayStatus: this.getDelayStatus()
      },
      flight: {
        direct: this.isDirect(),
        stops: this.stops,
        layoverDuration: this.layoverDuration
      },
      amenities: {
        wifi: this.wifi,
        entertainment: this.entertainment,
        meals: this.meals,
        powerOutlets: this.powerOutlets,
        list: this.amenities
      },
      baggage: this.baggagePolicy,
      booking: {
        refundable: this.refundable,
        changeable: this.changeable,
        changeFeesApply: this.changeFeesApply
      },
      environmental: {
        co2Emissions: this.co2Emissions,
        rating: this.environmentalRating,
        impact: this.getEnvironmentalImpact()
      },
      loyalty: {
        milesEarned: this.milesEarned,
        tierPointsEarned: this.tierPointsEarned
      },
      metadata: {
        searchId: this.searchId,
        providerId: this.providerId,
        lastUpdated: this.lastUpdated,
        validUntil: this.validUntil
      }
    }
  }
  
  /**
   * Create flight from external API response
   */
  static fromApiResponse(apiData, providerId) {
    // Transform external API data to Flight model
    // This would be customized based on the specific API (Amadeus, Sabre, etc.)
    return new Flight({
      ...apiData,
      providerId,
      lastUpdated: new Date()
    })
  }
}

module.exports = Flight