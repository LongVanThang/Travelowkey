const { setCache, getCache, deleteCache, CACHE_TTL, CACHE_KEYS } = require('../config/redis');
const { publishEvent, TOPICS, EVENT_TYPES } = require('../config/kafka');
const Booking = require('../models/Booking');
const logger = require('../utils/logger');
const axios = require('axios');
const retry = require('async-retry');
const { v4: uuidv4 } = require('uuid');

class SagaOrchestrator {
  constructor() {
    this.activeTransactions = new Map();
    this.compensationHandlers = new Map();
    this.serviceEndpoints = {
      flight: process.env.FLIGHT_SERVICE_URL || 'http://localhost:3001',
      hotel: process.env.HOTEL_SERVICE_URL || 'http://localhost:3002',
      car: process.env.CAR_SERVICE_URL || 'http://localhost:3003',
      payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005',
      notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006'
    };
    this.timeout = 30000; // 30 seconds timeout for service calls
  }

  async initialize() {
    try {
      // Load active transactions from cache
      await this.loadActiveTransactions();
      
      // Setup compensation handlers
      this.setupCompensationHandlers();
      
      logger.info('SagaOrchestrator initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize SagaOrchestrator:', error);
      throw error;
    }
  }

  // Main booking orchestration method
  async createBooking(bookingData) {
    try {
      // Create booking instance
      const booking = new Booking(bookingData);
      const validationErrors = booking.validate();
      
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Determine required services based on booking components
      const requiredServices = this.determineRequiredServices(booking);
      
      // Create saga steps
      const sagaSteps = this.createSagaSteps(booking, requiredServices);
      
      // Start the saga
      booking.startSaga(sagaSteps);
      
      // Store booking
      const bookingKey = `${CACHE_KEYS.BOOKING}${booking.id}`;
      await setCache(bookingKey, booking.toSagaJson(), CACHE_TTL.BOOKING_DATA);
      
      // Add to active transactions
      this.activeTransactions.set(booking.saga.transactionId, {
        bookingId: booking.id,
        steps: sagaSteps,
        currentStep: 0,
        startedAt: new Date()
      });

      // Publish saga started event
      await publishEvent(TOPICS.BOOKING_EVENTS, EVENT_TYPES.SAGA_STARTED, {
        bookingId: booking.id,
        transactionId: booking.saga.transactionId,
        steps: sagaSteps.map(step => step.name)
      });

      // Execute saga asynchronously
      this.executeSaga(booking.id).catch(error => {
        logger.error(`Saga execution failed for booking ${booking.id}:`, error);
      });

      logger.info(`Booking saga started: ${booking.id} (${booking.saga.transactionId})`);
      return booking.toPublicJson();
    } catch (error) {
      logger.error('Error creating booking:', error);
      throw error;
    }
  }

  // Execute saga workflow
  async executeSaga(bookingId) {
    try {
      const booking = await this.getBooking(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      const transaction = this.activeTransactions.get(booking.saga.transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      const { steps } = transaction;
      
      logger.info(`Executing saga for booking ${bookingId} with ${steps.length} steps`);

      // Execute each step
      for (let i = booking.saga.currentStep; i < steps.length; i++) {
        const step = steps[i];
        
        try {
          logger.info(`Executing step ${i + 1}/${steps.length}: ${step.name} for booking ${bookingId}`);
          
          // Execute the step
          const result = await this.executeStep(booking, step);
          
          // Update booking with step completion
          booking.completeStep(step.name, result);
          booking.updateServiceStatus(step.service, 'completed', result);
          
          // Save updated booking
          await this.saveBooking(booking);
          
          logger.info(`Step ${step.name} completed successfully for booking ${bookingId}`);
          
        } catch (error) {
          logger.error(`Step ${step.name} failed for booking ${bookingId}:`, error);
          
          // Mark step as failed
          booking.failStep(step.name, error);
          booking.updateServiceStatus(step.service, 'failed', { error: error.message });
          
          // Check if we should retry
          if (booking.saga.retryCount < booking.saga.maxRetries) {
            logger.info(`Retrying step ${step.name} for booking ${bookingId} (attempt ${booking.saga.retryCount + 1})`);
            
            // Retry with exponential backoff
            const delay = Math.pow(2, booking.saga.retryCount) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            
            i--; // Retry the same step
            continue;
          }
          
          // Max retries reached, start compensation
          await this.startCompensation(booking);
          return;
        }
      }

      // All steps completed successfully
      await this.completeSaga(booking);
      
    } catch (error) {
      logger.error('Error executing saga:', error);
      
      try {
        const booking = await this.getBooking(bookingId);
        if (booking) {
          await this.startCompensation(booking);
        }
      } catch (compensationError) {
        logger.error('Error starting compensation:', compensationError);
      }
    }
  }

  // Execute individual saga step
  async executeStep(booking, step) {
    const { service, action, payload } = step;
    
    try {
      switch (service) {
        case 'flight':
          return await this.executeFlightStep(booking, action, payload);
        case 'hotel':
          return await this.executeHotelStep(booking, action, payload);
        case 'car':
          return await this.executeCarStep(booking, action, payload);
        case 'payment':
          return await this.executePaymentStep(booking, action, payload);
        case 'notification':
          return await this.executeNotificationStep(booking, action, payload);
        default:
          throw new Error(`Unknown service: ${service}`);
      }
    } catch (error) {
      logger.error(`Error executing ${service} step:`, error);
      throw error;
    }
  }

  // Flight service integration
  async executeFlightStep(booking, action, payload) {
    const endpoint = this.serviceEndpoints.flight;
    
    switch (action) {
      case 'search':
        return await this.callService('POST', `${endpoint}/api/search`, payload);
      case 'book':
        return await this.callService('POST', `${endpoint}/api/bookings`, payload);
      case 'hold':
        return await this.callService('POST', `${endpoint}/api/bookings/hold`, payload);
      case 'confirm':
        return await this.callService('POST', `${endpoint}/api/bookings/${payload.bookingId}/confirm`, payload);
      default:
        throw new Error(`Unknown flight action: ${action}`);
    }
  }

  // Hotel service integration
  async executeHotelStep(booking, action, payload) {
    const endpoint = this.serviceEndpoints.hotel;
    
    switch (action) {
      case 'search':
        return await this.callService('POST', `${endpoint}/api/search`, payload);
      case 'book':
        return await this.callService('POST', `${endpoint}/api/bookings`, payload);
      case 'hold':
        return await this.callService('POST', `${endpoint}/api/bookings/hold`, payload);
      case 'confirm':
        return await this.callService('POST', `${endpoint}/api/bookings/${payload.bookingId}/confirm`, payload);
      default:
        throw new Error(`Unknown hotel action: ${action}`);
    }
  }

  // Car service integration
  async executeCarStep(booking, action, payload) {
    const endpoint = this.serviceEndpoints.car;
    
    switch (action) {
      case 'search':
        return await this.callService('POST', `${endpoint}/api/search`, payload);
      case 'book':
        return await this.callService('POST', `${endpoint}/api/bookings`, payload);
      case 'hold':
        return await this.callService('POST', `${endpoint}/api/bookings/hold`, payload);
      case 'confirm':
        return await this.callService('POST', `${endpoint}/api/bookings/${payload.bookingId}/confirm`, payload);
      default:
        throw new Error(`Unknown car action: ${action}`);
    }
  }

  // Payment service integration
  async executePaymentStep(booking, action, payload) {
    const endpoint = this.serviceEndpoints.payment;
    
    switch (action) {
      case 'create_intent':
        return await this.callService('POST', `${endpoint}/api/payment-intents`, payload);
      case 'authorize':
        return await this.callService('POST', `${endpoint}/api/payments/authorize`, payload);
      case 'capture':
        return await this.callService('POST', `${endpoint}/api/payments/capture`, payload);
      case 'verify':
        return await this.callService('GET', `${endpoint}/api/payments/${payload.transactionId}/verify`);
      default:
        throw new Error(`Unknown payment action: ${action}`);
    }
  }

  // Notification service integration
  async executeNotificationStep(booking, action, payload) {
    const endpoint = this.serviceEndpoints.notification;
    
    switch (action) {
      case 'send_confirmation':
        return await this.callService('POST', `${endpoint}/api/notifications/booking-confirmation`, payload);
      case 'send_receipt':
        return await this.callService('POST', `${endpoint}/api/notifications/payment-receipt`, payload);
      case 'send_itinerary':
        return await this.callService('POST', `${endpoint}/api/notifications/itinerary`, payload);
      default:
        throw new Error(`Unknown notification action: ${action}`);
    }
  }

  // Generic service call with retry logic
  async callService(method, url, data = {}, headers = {}) {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Service': 'booking-service',
      'X-Transaction-Id': uuidv4(),
      ...headers
    };

    return await retry(
      async () => {
        const response = await axios({
          method,
          url,
          data: method !== 'GET' ? data : undefined,
          params: method === 'GET' ? data : undefined,
          headers: defaultHeaders,
          timeout: this.timeout
        });

        return response.data;
      },
      {
        retries: 3,
        factor: 2,
        minTimeout: 1000,
        maxTimeout: 5000,
        onRetry: (error, attempt) => {
          logger.warn(`Retry attempt ${attempt} for ${method} ${url}:`, error.message);
        }
      }
    );
  }

  // Compensation workflow
  async startCompensation(booking) {
    try {
      logger.info(`Starting compensation for booking ${booking.id}`);
      
      booking.startCompensation();
      await this.saveBooking(booking);

      // Execute compensation actions in reverse order
      const completedSteps = [...booking.saga.completedSteps].reverse();
      
      for (const stepInfo of completedSteps) {
        try {
          const compensationAction = this.getCompensationAction(stepInfo.step);
          if (compensationAction) {
            logger.info(`Executing compensation for step ${stepInfo.step}`);
            
            await this.executeCompensation(booking, compensationAction, stepInfo.result);
            booking.completeCompensation(stepInfo.step);
            
            logger.info(`Compensation completed for step ${stepInfo.step}`);
          }
        } catch (error) {
          logger.error(`Compensation failed for step ${stepInfo.step}:`, error);
          // Continue with other compensations even if one fails
        }
      }

      // Mark saga as failed and booking as cancelled
      booking.failSaga();
      booking.setCancelled('Saga compensation completed');
      
      await this.saveBooking(booking);
      
      // Remove from active transactions
      this.activeTransactions.delete(booking.saga.transactionId);

      // Publish compensation completed event
      await publishEvent(TOPICS.BOOKING_EVENTS, EVENT_TYPES.SAGA_COMPENSATED, {
        bookingId: booking.id,
        transactionId: booking.saga.transactionId
      });

      logger.info(`Compensation completed for booking ${booking.id}`);
      
    } catch (error) {
      logger.error('Error in compensation workflow:', error);
      throw error;
    }
  }

  async executeCompensation(booking, compensation, originalResult) {
    const { service, action, payload } = compensation;
    
    // Merge original result data with compensation payload
    const compensationPayload = {
      ...payload,
      originalBookingId: originalResult.bookingId,
      originalTransactionId: originalResult.transactionId,
      reason: 'saga_compensation'
    };

    switch (service) {
      case 'flight':
        return await this.compensateFlightStep(action, compensationPayload);
      case 'hotel':
        return await this.compensateHotelStep(action, compensationPayload);
      case 'car':
        return await this.compensateCarStep(action, compensationPayload);
      case 'payment':
        return await this.compensatePaymentStep(action, compensationPayload);
      default:
        logger.warn(`No compensation handler for service: ${service}`);
    }
  }

  async compensateFlightStep(action, payload) {
    const endpoint = this.serviceEndpoints.flight;
    
    switch (action) {
      case 'cancel_booking':
        return await this.callService('DELETE', `${endpoint}/api/bookings/${payload.originalBookingId}`, payload);
      case 'release_hold':
        return await this.callService('POST', `${endpoint}/api/bookings/${payload.originalBookingId}/release`, payload);
      default:
        logger.warn(`Unknown flight compensation action: ${action}`);
    }
  }

  async compensateHotelStep(action, payload) {
    const endpoint = this.serviceEndpoints.hotel;
    
    switch (action) {
      case 'cancel_booking':
        return await this.callService('DELETE', `${endpoint}/api/bookings/${payload.originalBookingId}`, payload);
      case 'release_hold':
        return await this.callService('POST', `${endpoint}/api/bookings/${payload.originalBookingId}/release`, payload);
      default:
        logger.warn(`Unknown hotel compensation action: ${action}`);
    }
  }

  async compensateCarStep(action, payload) {
    const endpoint = this.serviceEndpoints.car;
    
    switch (action) {
      case 'cancel_booking':
        return await this.callService('DELETE', `${endpoint}/api/bookings/${payload.originalBookingId}`, payload);
      case 'release_hold':
        return await this.callService('POST', `${endpoint}/api/bookings/${payload.originalBookingId}/release`, payload);
      default:
        logger.warn(`Unknown car compensation action: ${action}`);
    }
  }

  async compensatePaymentStep(action, payload) {
    const endpoint = this.serviceEndpoints.payment;
    
    switch (action) {
      case 'refund':
        return await this.callService('POST', `${endpoint}/api/payments/refund`, payload);
      case 'void':
        return await this.callService('POST', `${endpoint}/api/payments/void`, payload);
      default:
        logger.warn(`Unknown payment compensation action: ${action}`);
    }
  }

  // Complete saga successfully
  async completeSaga(booking) {
    try {
      booking.completeSaga();
      await this.saveBooking(booking);
      
      // Remove from active transactions
      this.activeTransactions.delete(booking.saga.transactionId);

      // Publish saga completed event
      await publishEvent(TOPICS.BOOKING_EVENTS, EVENT_TYPES.SAGA_COMPLETED, {
        bookingId: booking.id,
        transactionId: booking.saga.transactionId
      });

      logger.info(`Saga completed successfully for booking ${booking.id}`);
    } catch (error) {
      logger.error('Error completing saga:', error);
      throw error;
    }
  }

  // Helper methods
  determineRequiredServices(booking) {
    const services = [];
    
    if (booking.components.flight) {
      services.push('flight');
      booking.services.flight.required = true;
    }
    
    if (booking.components.hotel) {
      services.push('hotel');
      booking.services.hotel.required = true;
    }
    
    if (booking.components.car) {
      services.push('car');
      booking.services.car.required = true;
    }
    
    // Payment and notification are always required
    services.push('payment');
    services.push('notification');
    
    return services;
  }

  createSagaSteps(booking, requiredServices) {
    const steps = [];
    
    // Step 1: Hold/reserve all services
    if (requiredServices.includes('flight')) {
      steps.push({
        name: 'hold_flight',
        service: 'flight',
        action: 'hold',
        payload: booking.components.flight
      });
    }
    
    if (requiredServices.includes('hotel')) {
      steps.push({
        name: 'hold_hotel',
        service: 'hotel',
        action: 'hold',
        payload: booking.components.hotel
      });
    }
    
    if (requiredServices.includes('car')) {
      steps.push({
        name: 'hold_car',
        service: 'car',
        action: 'hold',
        payload: booking.components.car
      });
    }
    
    // Step 2: Process payment
    steps.push({
      name: 'process_payment',
      service: 'payment',
      action: 'authorize',
      payload: {
        amount: booking.pricing.total,
        currency: booking.pricing.currency,
        customerId: booking.customerId,
        bookingId: booking.id
      }
    });
    
    // Step 3: Confirm all service bookings
    if (requiredServices.includes('flight')) {
      steps.push({
        name: 'confirm_flight',
        service: 'flight',
        action: 'confirm',
        payload: booking.components.flight
      });
    }
    
    if (requiredServices.includes('hotel')) {
      steps.push({
        name: 'confirm_hotel',
        service: 'hotel',
        action: 'confirm',
        payload: booking.components.hotel
      });
    }
    
    if (requiredServices.includes('car')) {
      steps.push({
        name: 'confirm_car',
        service: 'car',
        action: 'confirm',
        payload: booking.components.car
      });
    }
    
    // Step 4: Capture payment
    steps.push({
      name: 'capture_payment',
      service: 'payment',
      action: 'capture',
      payload: {
        bookingId: booking.id
      }
    });
    
    // Step 5: Send confirmation notifications
    steps.push({
      name: 'send_confirmation',
      service: 'notification',
      action: 'send_confirmation',
      payload: {
        bookingId: booking.id,
        customerId: booking.customerId,
        email: booking.communication.emailAddress,
        phone: booking.communication.phoneNumber
      }
    });
    
    return steps;
  }

  getCompensationAction(stepName) {
    return this.compensationHandlers.get(stepName);
  }

  setupCompensationHandlers() {
    this.compensationHandlers.set('hold_flight', {
      service: 'flight',
      action: 'release_hold'
    });
    
    this.compensationHandlers.set('hold_hotel', {
      service: 'hotel',
      action: 'release_hold'
    });
    
    this.compensationHandlers.set('hold_car', {
      service: 'car',
      action: 'release_hold'
    });
    
    this.compensationHandlers.set('process_payment', {
      service: 'payment',
      action: 'void'
    });
    
    this.compensationHandlers.set('confirm_flight', {
      service: 'flight',
      action: 'cancel_booking'
    });
    
    this.compensationHandlers.set('confirm_hotel', {
      service: 'hotel',
      action: 'cancel_booking'
    });
    
    this.compensationHandlers.set('confirm_car', {
      service: 'car',
      action: 'cancel_booking'
    });
    
    this.compensationHandlers.set('capture_payment', {
      service: 'payment',
      action: 'refund'
    });
  }

  async getBooking(bookingId) {
    try {
      const bookingKey = `${CACHE_KEYS.BOOKING}${bookingId}`;
      const bookingData = await getCache(bookingKey);
      
      if (!bookingData) {
        return null;
      }
      
      return new Booking(bookingData);
    } catch (error) {
      logger.error('Error getting booking:', error);
      throw error;
    }
  }

  async saveBooking(booking) {
    try {
      const bookingKey = `${CACHE_KEYS.BOOKING}${booking.id}`;
      await setCache(bookingKey, booking.toSagaJson(), CACHE_TTL.BOOKING_DATA);
    } catch (error) {
      logger.error('Error saving booking:', error);
      throw error;
    }
  }

  async loadActiveTransactions() {
    try {
      // Load active transaction IDs from cache
      const activeTransactionIds = await getCache(CACHE_KEYS.ACTIVE_TRANSACTIONS);
      
      if (activeTransactionIds) {
        for (const transactionId of activeTransactionIds) {
          const transactionData = await getCache(`${CACHE_KEYS.TRANSACTION}${transactionId}`);
          if (transactionData) {
            this.activeTransactions.set(transactionId, transactionData);
          }
        }
      }
      
      logger.info(`Loaded ${this.activeTransactions.size} active transactions`);
    } catch (error) {
      logger.error('Error loading active transactions:', error);
    }
  }

  // Clean up expired transactions
  async cleanupExpiredTransactions() {
    const now = new Date();
    const expiredTransactions = [];
    
    for (const [transactionId, transaction] of this.activeTransactions.entries()) {
      const age = now - new Date(transaction.startedAt);
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (age > maxAge) {
        expiredTransactions.push(transactionId);
      }
    }
    
    for (const transactionId of expiredTransactions) {
      try {
        const transaction = this.activeTransactions.get(transactionId);
        const booking = await this.getBooking(transaction.bookingId);
        
        if (booking && booking.status === 'pending') {
          await this.startCompensation(booking);
        }
        
        this.activeTransactions.delete(transactionId);
      } catch (error) {
        logger.error(`Error cleaning up expired transaction ${transactionId}:`, error);
      }
    }
    
    logger.info(`Cleaned up ${expiredTransactions.length} expired transactions`);
  }
}

module.exports = SagaOrchestrator;