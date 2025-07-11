const { setCache, getCache, deleteCache, setCacheHash, getCacheHash, CACHE_TTL, CACHE_KEYS } = require('../config/redis');
const { publishEvent, TOPICS, EVENT_TYPES } = require('../config/kafka');
const Car = require('../models/Car');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const { addDays, isAfter, isBefore, isWithinInterval } = require('date-fns');

class FleetManagerService {
  constructor() {
    this.initialized = false;
    this.fleetStats = new Map();
    this.activeBookings = new Map();
    this.maintenanceQueue = new Set();
  }

  async initialize() {
    try {
      // Load fleet data from cache or initialize
      await this.loadFleetData();
      await this.initializeFleetStats();
      
      this.initialized = true;
      logger.info('FleetManagerService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize FleetManagerService:', error);
      throw error;
    }
  }

  // Fleet Management Methods
  async addCarToFleet(carData) {
    try {
      const car = new Car(carData);
      const validationErrors = car.validate();
      
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Check for duplicate license plate
      const existingCar = await this.findCarByLicensePlate(car.licensePlate);
      if (existingCar) {
        throw new Error(`Car with license plate ${car.licensePlate} already exists`);
      }

      // Store car in cache
      const carKey = `${CACHE_KEYS.CAR}${car.id}`;
      await setCache(carKey, car.toFleetJson(), CACHE_TTL.VEHICLE_DATA);

      // Add to fleet index
      await this.addToFleetIndex(car);

      // Update fleet statistics
      await this.updateFleetStats();

      // Publish event
      await publishEvent(TOPICS.FLEET_EVENTS, EVENT_TYPES.CAR_ADDED, car.toFleetJson());

      logger.info(`Car added to fleet: ${car.id} (${car.licensePlate})`);
      return car.toPublicJson();
    } catch (error) {
      logger.error('Error adding car to fleet:', error);
      throw error;
    }
  }

  async getCarById(carId) {
    try {
      const carKey = `${CACHE_KEYS.CAR}${carId}`;
      const carData = await getCache(carKey);
      
      if (!carData) {
        return null;
      }

      return new Car(carData);
    } catch (error) {
      logger.error('Error getting car by ID:', error);
      throw error;
    }
  }

  async updateCar(carId, updateData) {
    try {
      const car = await this.getCarById(carId);
      if (!car) {
        throw new Error('Car not found');
      }

      // Merge updates
      const updatedCarData = { ...car, ...updateData, updatedAt: new Date() };
      const updatedCar = new Car(updatedCarData);
      
      const validationErrors = updatedCar.validate();
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Update in cache
      const carKey = `${CACHE_KEYS.CAR}${carId}`;
      await setCache(carKey, updatedCar.toFleetJson(), CACHE_TTL.VEHICLE_DATA);

      // Update fleet index if location or status changed
      if (updateData.currentLocation || updateData.status) {
        await this.updateFleetIndex(updatedCar);
      }

      // Publish event
      await publishEvent(TOPICS.FLEET_EVENTS, EVENT_TYPES.CAR_UPDATED, updatedCar.toFleetJson());

      logger.info(`Car updated: ${carId}`);
      return updatedCar.toPublicJson();
    } catch (error) {
      logger.error('Error updating car:', error);
      throw error;
    }
  }

  async removeCarFromFleet(carId, reason) {
    try {
      const car = await this.getCarById(carId);
      if (!car) {
        throw new Error('Car not found');
      }

      // Check if car is currently rented
      if (car.status === 'rented') {
        throw new Error('Cannot remove car that is currently rented');
      }

      // Mark as retired
      car.retiredAt = new Date();
      car.status = 'retired';
      car.availability.isAvailable = false;
      car.availability.reason = reason || 'Removed from fleet';

      // Update in cache
      const carKey = `${CACHE_KEYS.CAR}${carId}`;
      await setCache(carKey, car.toFleetJson(), CACHE_TTL.VEHICLE_DATA);

      // Remove from active fleet index
      await this.removeFromFleetIndex(carId);

      // Publish event
      await publishEvent(TOPICS.FLEET_EVENTS, EVENT_TYPES.CAR_REMOVED, { id: carId, reason });

      logger.info(`Car removed from fleet: ${carId} - ${reason}`);
      return true;
    } catch (error) {
      logger.error('Error removing car from fleet:', error);
      throw error;
    }
  }

  // Search and Availability Methods
  async searchAvailableCars(searchParams) {
    try {
      const {
        location,
        startDate,
        endDate,
        category,
        transmission,
        fuelType,
        seatingCapacity,
        features = [],
        priceRange,
        sortBy = 'price',
        sortOrder = 'asc',
        page = 1,
        limit = 20
      } = searchParams;

      // Generate cache key for search
      const searchKey = this.generateSearchCacheKey(searchParams);
      const cachedResults = await getCache(searchKey);
      if (cachedResults) {
        return cachedResults;
      }

      // Get all available cars
      const availableCars = await this.getAvailableCarsByLocation(location);
      
      // Filter by availability for date range
      const carsForDates = [];
      for (const car of availableCars) {
        if (car.isAvailableForDates(startDate, endDate)) {
          carsForDates.push(car);
        }
      }

      // Apply filters
      let filteredCars = this.applyFilters(carsForDates, {
        category,
        transmission,
        fuelType,
        seatingCapacity,
        features,
        priceRange
      });

      // Calculate pricing for each car
      filteredCars = filteredCars.map(car => {
        const pricing = car.calculatePrice(startDate, endDate);
        return {
          ...car.toPublicJson(),
          pricing: {
            ...car.pricing,
            calculatedPrice: pricing
          }
        };
      });

      // Sort results
      filteredCars = this.sortCars(filteredCars, sortBy, sortOrder);

      // Paginate
      const total = filteredCars.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedCars = filteredCars.slice(startIndex, endIndex);

      const result = {
        cars: paginatedCars,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        filters: {
          appliedFilters: { category, transmission, fuelType, seatingCapacity, features, priceRange },
          availableFilters: await this.getAvailableFilters(location)
        },
        searchCriteria: {
          location,
          startDate,
          endDate,
          duration: Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))
        },
        timestamp: new Date().toISOString()
      };

      // Cache results for 15 minutes
      await setCache(searchKey, result, CACHE_TTL.SEARCH_RESULTS);

      return result;
    } catch (error) {
      logger.error('Error searching available cars:', error);
      throw error;
    }
  }

  async getAvailableCarsByLocation(location) {
    try {
      const locationKey = `${CACHE_KEYS.LOCATION}${location}`;
      const carIds = await getCache(locationKey);
      
      if (!carIds || carIds.length === 0) {
        return [];
      }

      const cars = [];
      for (const carId of carIds) {
        const car = await this.getCarById(carId);
        if (car && car.status === 'available' && car.availability.isAvailable) {
          cars.push(car);
        }
      }

      return cars;
    } catch (error) {
      logger.error('Error getting available cars by location:', error);
      return [];
    }
  }

  applyFilters(cars, filters) {
    return cars.filter(car => {
      // Category filter
      if (filters.category && car.category !== filters.category) {
        return false;
      }

      // Transmission filter
      if (filters.transmission && car.transmission !== filters.transmission) {
        return false;
      }

      // Fuel type filter
      if (filters.fuelType && car.fuelType !== filters.fuelType) {
        return false;
      }

      // Seating capacity filter
      if (filters.seatingCapacity && car.seatingCapacity < filters.seatingCapacity) {
        return false;
      }

      // Features filter
      if (filters.features && filters.features.length > 0) {
        const hasAllFeatures = filters.features.every(feature => 
          car.features.includes(feature) || 
          car.safetyFeatures.includes(feature) ||
          car.entertainmentFeatures.includes(feature) ||
          car.comfortFeatures.includes(feature)
        );
        if (!hasAllFeatures) {
          return false;
        }
      }

      // Price range filter (will be applied after pricing calculation)
      return true;
    });
  }

  sortCars(cars, sortBy, sortOrder) {
    return cars.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'price':
          aValue = a.pricing.calculatedPrice.basePrice;
          bValue = b.pricing.calculatedPrice.basePrice;
          break;
        case 'year':
          aValue = a.year;
          bValue = b.year;
          break;
        case 'category':
          aValue = a.category;
          bValue = b.category;
          break;
        case 'seatingCapacity':
          aValue = a.seatingCapacity;
          bValue = b.seatingCapacity;
          break;
        case 'fuelEfficiency':
          aValue = a.environmental.fuelEfficiency;
          bValue = b.environmental.fuelEfficiency;
          break;
        default:
          aValue = a.pricing.calculatedPrice.basePrice;
          bValue = b.pricing.calculatedPrice.basePrice;
      }

      if (typeof aValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }

  // Booking Management
  async createBooking(bookingData) {
    try {
      const {
        carId,
        customerId,
        startDate,
        endDate,
        pickupLocation,
        returnLocation,
        driverAge,
        additionalDrivers = [],
        insurance = false,
        extras = []
      } = bookingData;

      // Validate car availability
      const car = await this.getCarById(carId);
      if (!car) {
        throw new Error('Car not found');
      }

      if (!car.isAvailableForDates(startDate, endDate)) {
        throw new Error('Car is not available for the selected dates');
      }

      // Calculate pricing
      const pricing = car.calculatePrice(startDate, endDate, { includeInsurance: insurance });

      // Create booking
      const booking = {
        id: uuidv4(),
        carId,
        customerId,
        startDate,
        endDate,
        pickupLocation,
        returnLocation,
        driverAge,
        additionalDrivers,
        insurance,
        extras,
        pricing,
        status: 'confirmed',
        bookingDate: new Date(),
        confirmationNumber: this.generateConfirmationNumber()
      };

      // Update car status
      car.setRented(booking.id, customerId, startDate, endDate, car.mileage.current, car.tracking.fuelLevel);
      
      // Update car in cache
      const carKey = `${CACHE_KEYS.CAR}${carId}`;
      await setCache(carKey, car.toFleetJson(), CACHE_TTL.VEHICLE_DATA);

      // Store booking
      const bookingKey = `${CACHE_KEYS.BOOKING}${booking.id}`;
      await setCache(bookingKey, booking, CACHE_TTL.BOOKING_DATA);

      // Add to active bookings
      this.activeBookings.set(booking.id, booking);

      // Update fleet statistics
      await this.updateFleetStats();

      // Publish events
      await publishEvent(TOPICS.BOOKING_EVENTS, EVENT_TYPES.BOOKING_CREATED, booking);
      await publishEvent(TOPICS.FLEET_EVENTS, EVENT_TYPES.CAR_RENTED, car.toFleetJson());

      logger.info(`Booking created: ${booking.id} for car ${carId}`);
      return booking;
    } catch (error) {
      logger.error('Error creating booking:', error);
      throw error;
    }
  }

  async cancelBooking(bookingId, reason) {
    try {
      const bookingKey = `${CACHE_KEYS.BOOKING}${bookingId}`;
      const booking = await getCache(bookingKey);
      
      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.status !== 'confirmed') {
        throw new Error('Booking cannot be cancelled');
      }

      // Update booking status
      booking.status = 'cancelled';
      booking.cancellationDate = new Date();
      booking.cancellationReason = reason;

      // Update car status back to available
      const car = await this.getCarById(booking.carId);
      if (car) {
        car.setAvailable();
        
        const carKey = `${CACHE_KEYS.CAR}${booking.carId}`;
        await setCache(carKey, car.toFleetJson(), CACHE_TTL.VEHICLE_DATA);
      }

      // Update booking in cache
      await setCache(bookingKey, booking, CACHE_TTL.BOOKING_DATA);

      // Remove from active bookings
      this.activeBookings.delete(bookingId);

      // Update fleet statistics
      await this.updateFleetStats();

      // Publish events
      await publishEvent(TOPICS.BOOKING_EVENTS, EVENT_TYPES.BOOKING_CANCELLED, booking);
      
      if (car) {
        await publishEvent(TOPICS.FLEET_EVENTS, EVENT_TYPES.CAR_AVAILABLE, car.toFleetJson());
      }

      logger.info(`Booking cancelled: ${bookingId} - ${reason}`);
      return booking;
    } catch (error) {
      logger.error('Error cancelling booking:', error);
      throw error;
    }
  }

  // Maintenance Management
  async scheduleMaintenace(carId, maintenanceData) {
    try {
      const car = await this.getCarById(carId);
      if (!car) {
        throw new Error('Car not found');
      }

      const maintenanceItem = {
        id: uuidv4(),
        carId,
        type: maintenanceData.type,
        description: maintenanceData.description,
        scheduledDate: maintenanceData.scheduledDate,
        estimatedDuration: maintenanceData.estimatedDuration,
        priority: maintenanceData.priority || 'normal',
        status: 'scheduled',
        createdAt: new Date()
      };

      // Add to car's maintenance schedule
      car.maintenance.maintenanceSchedule.push(maintenanceItem);

      // Update car in cache
      const carKey = `${CACHE_KEYS.CAR}${carId}`;
      await setCache(carKey, car.toFleetJson(), CACHE_TTL.VEHICLE_DATA);

      // Add to maintenance queue
      this.maintenanceQueue.add(maintenanceItem.id);

      // Store maintenance item
      const maintenanceKey = `${CACHE_KEYS.MAINTENANCE}${maintenanceItem.id}`;
      await setCache(maintenanceKey, maintenanceItem, CACHE_TTL.MAINTENANCE_DATA);

      // Publish event
      await publishEvent(TOPICS.MAINTENANCE_EVENTS, EVENT_TYPES.MAINTENANCE_SCHEDULED, maintenanceItem);

      logger.info(`Maintenance scheduled for car ${carId}: ${maintenanceItem.id}`);
      return maintenanceItem;
    } catch (error) {
      logger.error('Error scheduling maintenance:', error);
      throw error;
    }
  }

  async completeMaintenance(maintenanceId, completionData) {
    try {
      const maintenanceKey = `${CACHE_KEYS.MAINTENANCE}${maintenanceId}`;
      const maintenance = await getCache(maintenanceKey);
      
      if (!maintenance) {
        throw new Error('Maintenance record not found');
      }

      // Update maintenance record
      maintenance.status = 'completed';
      maintenance.completedDate = new Date();
      maintenance.actualDuration = completionData.actualDuration;
      maintenance.cost = completionData.cost;
      maintenance.notes = completionData.notes;
      maintenance.performedBy = completionData.performedBy;

      // Update car
      const car = await this.getCarById(maintenance.carId);
      if (car) {
        car.completeMaintenance({
          type: maintenance.type,
          cost: maintenance.cost,
          description: maintenance.description,
          performedBy: maintenance.performedBy,
          notes: maintenance.notes
        });

        // Update mileage if provided
        if (completionData.currentMileage) {
          car.updateMileage(completionData.currentMileage);
        }

        // Add cost to financial tracking
        if (maintenance.cost) {
          car.addCost(maintenance.cost, 'maintenance');
        }

        const carKey = `${CACHE_KEYS.CAR}${maintenance.carId}`;
        await setCache(carKey, car.toFleetJson(), CACHE_TTL.VEHICLE_DATA);
      }

      // Update maintenance record
      await setCache(maintenanceKey, maintenance, CACHE_TTL.MAINTENANCE_DATA);

      // Remove from maintenance queue
      this.maintenanceQueue.delete(maintenanceId);

      // Publish events
      await publishEvent(TOPICS.MAINTENANCE_EVENTS, EVENT_TYPES.MAINTENANCE_COMPLETED, maintenance);
      
      if (car && car.status === 'available') {
        await publishEvent(TOPICS.FLEET_EVENTS, EVENT_TYPES.CAR_AVAILABLE, car.toFleetJson());
      }

      logger.info(`Maintenance completed for car ${maintenance.carId}: ${maintenanceId}`);
      return maintenance;
    } catch (error) {
      logger.error('Error completing maintenance:', error);
      throw error;
    }
  }

  // Scheduled Tasks
  async updateFleetStatus() {
    try {
      // Update all car statuses based on current time and bookings
      const activeCarIds = await this.getActiveCarIds();
      
      for (const carId of activeCarIds) {
        const car = await this.getCarById(carId);
        if (!car) continue;

        // Check if rental should end
        if (car.status === 'rented' && car.currentRental.endDate) {
          const endDate = new Date(car.currentRental.endDate);
          if (isAfter(new Date(), endDate)) {
            // Rental should have ended
            car.setAvailable();
            
            const carKey = `${CACHE_KEYS.CAR}${carId}`;
            await setCache(carKey, car.toFleetJson(), CACHE_TTL.VEHICLE_DATA);

            // Publish event
            await publishEvent(TOPICS.FLEET_EVENTS, EVENT_TYPES.CAR_AVAILABLE, car.toFleetJson());
          }
        }

        // Check maintenance schedule
        for (const maintenance of car.maintenance.maintenanceSchedule) {
          if (maintenance.status === 'scheduled') {
            const scheduledDate = new Date(maintenance.scheduledDate);
            const now = new Date();
            
            // If maintenance is due today and car is available
            if (now >= scheduledDate && car.status === 'available') {
              car.setMaintenance(maintenance.type, `Scheduled ${maintenance.type}`);
              
              const carKey = `${CACHE_KEYS.CAR}${carId}`;
              await setCache(carKey, car.toFleetJson(), CACHE_TTL.VEHICLE_DATA);

              // Update maintenance status
              maintenance.status = 'in-progress';
              const maintenanceKey = `${CACHE_KEYS.MAINTENANCE}${maintenance.id}`;
              await setCache(maintenanceKey, maintenance, CACHE_TTL.MAINTENANCE_DATA);

              // Publish events
              await publishEvent(TOPICS.MAINTENANCE_EVENTS, EVENT_TYPES.MAINTENANCE_STARTED, maintenance);
              await publishEvent(TOPICS.FLEET_EVENTS, EVENT_TYPES.CAR_MAINTENANCE, car.toFleetJson());
            }
          }
        }
      }

      // Update fleet statistics
      await this.updateFleetStats();
      
      logger.info('Fleet status updated successfully');
    } catch (error) {
      logger.error('Error updating fleet status:', error);
      throw error;
    }
  }

  async checkMaintenanceSchedule() {
    try {
      const activeCarIds = await this.getActiveCarIds();
      const now = new Date();
      const upcomingMaintenace = [];

      for (const carId of activeCarIds) {
        const car = await this.getCarById(carId);
        if (!car) continue;

        // Check if car needs maintenance based on mileage
        const milesSinceService = car.mileage.current - car.mileage.lastService;
        if (milesSinceService >= car.mileage.nextServiceDue) {
          upcomingMaintenace.push({
            carId: car.id,
            type: 'scheduled_service',
            reason: `Mileage service due (${milesSinceService} miles)`,
            priority: 'high'
          });
        }

        // Check insurance expiry
        if (car.insurance.expiryDate) {
          const expiryDate = new Date(car.insurance.expiryDate);
          const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
          
          if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
            upcomingMaintenace.push({
              carId: car.id,
              type: 'insurance_renewal',
              reason: `Insurance expires in ${daysUntilExpiry} days`,
              priority: daysUntilExpiry <= 7 ? 'urgent' : 'normal'
            });
          }
        }

        // Check registration expiry
        if (car.registration.expiryDate) {
          const expiryDate = new Date(car.registration.expiryDate);
          const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
          
          if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
            upcomingMaintenace.push({
              carId: car.id,
              type: 'registration_renewal',
              reason: `Registration expires in ${daysUntilExpiry} days`,
              priority: daysUntilExpiry <= 7 ? 'urgent' : 'normal'
            });
          }
        }
      }

      // Publish maintenance alerts
      for (const maintenance of upcomingMaintenace) {
        await publishEvent(TOPICS.MAINTENANCE_EVENTS, EVENT_TYPES.MAINTENANCE_DUE, maintenance);
      }

      logger.info(`Maintenance check completed. Found ${upcomingMaintenace.length} items requiring attention`);
      return upcomingMaintenace;
    } catch (error) {
      logger.error('Error checking maintenance schedule:', error);
      throw error;
    }
  }

  async processExpiredBookings() {
    try {
      const expiredBookings = [];
      const now = new Date();

      for (const [bookingId, booking] of this.activeBookings.entries()) {
        if (booking.status === 'confirmed') {
          const endDate = new Date(booking.endDate);
          
          // If booking end date has passed by more than 1 day
          if (isAfter(now, addDays(endDate, 1))) {
            expiredBookings.push(booking);
          }
        }
      }

      for (const booking of expiredBookings) {
        await this.cancelBooking(booking.id, 'Booking expired - auto-cancelled');
      }

      logger.info(`Processed ${expiredBookings.length} expired bookings`);
      return expiredBookings;
    } catch (error) {
      logger.error('Error processing expired bookings:', error);
      throw error;
    }
  }

  // Helper Methods
  async loadFleetData() {
    try {
      // Load fleet index
      const fleetIndex = await getCache(CACHE_KEYS.FLEET_INDEX);
      if (fleetIndex) {
        // Load active bookings
        const bookingIds = await getCache(CACHE_KEYS.ACTIVE_BOOKINGS);
        if (bookingIds) {
          for (const bookingId of bookingIds) {
            const booking = await getCache(`${CACHE_KEYS.BOOKING}${bookingId}`);
            if (booking) {
              this.activeBookings.set(bookingId, booking);
            }
          }
        }

        // Load maintenance queue
        const maintenanceIds = await getCache(CACHE_KEYS.MAINTENANCE_QUEUE);
        if (maintenanceIds) {
          for (const maintenanceId of maintenanceIds) {
            this.maintenanceQueue.add(maintenanceId);
          }
        }
      }

      logger.info('Fleet data loaded successfully');
    } catch (error) {
      logger.error('Error loading fleet data:', error);
    }
  }

  async initializeFleetStats() {
    try {
      const stats = {
        totalVehicles: 0,
        availableVehicles: 0,
        rentedVehicles: 0,
        maintenanceVehicles: 0,
        outOfServiceVehicles: 0,
        utilizationRate: 0,
        lastUpdated: new Date()
      };

      await setCache(CACHE_KEYS.FLEET_STATS, stats, CACHE_TTL.FLEET_STATS);
      this.fleetStats.set('global', stats);
    } catch (error) {
      logger.error('Error initializing fleet stats:', error);
    }
  }

  async updateFleetStats() {
    try {
      const activeCarIds = await this.getActiveCarIds();
      const stats = {
        totalVehicles: activeCarIds.length,
        availableVehicles: 0,
        rentedVehicles: 0,
        maintenanceVehicles: 0,
        outOfServiceVehicles: 0,
        lastUpdated: new Date()
      };

      // Count vehicles by status
      for (const carId of activeCarIds) {
        const car = await this.getCarById(carId);
        if (!car) continue;

        switch (car.status) {
          case 'available':
            stats.availableVehicles++;
            break;
          case 'rented':
            stats.rentedVehicles++;
            break;
          case 'maintenance':
            stats.maintenanceVehicles++;
            break;
          case 'out-of-service':
            stats.outOfServiceVehicles++;
            break;
        }
      }

      // Calculate utilization rate
      stats.utilizationRate = stats.totalVehicles > 0 
        ? Math.round((stats.rentedVehicles / stats.totalVehicles) * 100)
        : 0;

      await setCache(CACHE_KEYS.FLEET_STATS, stats, CACHE_TTL.FLEET_STATS);
      this.fleetStats.set('global', stats);

      return stats;
    } catch (error) {
      logger.error('Error updating fleet stats:', error);
      throw error;
    }
  }

  generateSearchCacheKey(searchParams) {
    const keyParts = [
      CACHE_KEYS.SEARCH,
      searchParams.location || 'all',
      searchParams.startDate || '',
      searchParams.endDate || '',
      searchParams.category || 'all',
      searchParams.transmission || 'all',
      searchParams.fuelType || 'all',
      searchParams.seatingCapacity || 'any',
      JSON.stringify(searchParams.features || []),
      JSON.stringify(searchParams.priceRange || {}),
      searchParams.sortBy || 'price',
      searchParams.sortOrder || 'asc',
      searchParams.page || 1,
      searchParams.limit || 20
    ];
    return keyParts.join(':');
  }

  generateConfirmationNumber() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `CR${timestamp}${random}`;
  }

  async getActiveCarIds() {
    try {
      const fleetIndex = await getCache(CACHE_KEYS.FLEET_INDEX);
      return fleetIndex ? fleetIndex.activeCarIds || [] : [];
    } catch (error) {
      logger.error('Error getting active car IDs:', error);
      return [];
    }
  }

  async addToFleetIndex(car) {
    // Implementation for fleet indexing
    // This would typically maintain location-based indices for efficient searching
  }

  async updateFleetIndex(car) {
    // Implementation for updating fleet indices
  }

  async removeFromFleetIndex(carId) {
    // Implementation for removing from fleet indices
  }

  async findCarByLicensePlate(licensePlate) {
    // Implementation for finding car by license plate
    return null;
  }

  async getAvailableFilters(location) {
    // Implementation for getting available filters
    return {};
  }
}

module.exports = FleetManagerService;