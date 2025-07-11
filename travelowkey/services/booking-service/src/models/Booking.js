const { v4: uuidv4 } = require('uuid');

class Booking {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.bookingNumber = data.bookingNumber || this.generateBookingNumber();
    this.customerId = data.customerId;
    this.customerInfo = data.customerInfo || {};
    
    // Booking type and components
    this.type = data.type || 'multi-service'; // flight-only, hotel-only, car-only, multi-service
    this.components = data.components || {}; // { flight: {...}, hotel: {...}, car: {...} }
    
    // Travel details
    this.travel = {
      departure: {
        date: data.travel?.departure?.date || null,
        location: data.travel?.departure?.location || '',
        airport: data.travel?.departure?.airport || '',
        terminal: data.travel?.departure?.terminal || ''
      },
      return: {
        date: data.travel?.return?.date || null,
        location: data.travel?.return?.location || '',
        airport: data.travel?.return?.airport || '',
        terminal: data.travel?.return?.terminal || ''
      },
      duration: data.travel?.duration || 0,
      destinations: data.travel?.destinations || [],
      isRoundTrip: data.travel?.isRoundTrip || true,
      tripType: data.travel?.tripType || 'leisure' // leisure, business, group
    };
    
    // Passengers and guests
    this.passengers = data.passengers || [];
    this.guestDetails = {
      adults: data.guestDetails?.adults || 1,
      children: data.guestDetails?.children || 0,
      infants: data.guestDetails?.infants || 0,
      totalGuests: data.guestDetails?.totalGuests || 1,
      rooms: data.guestDetails?.rooms || 1,
      specialRequests: data.guestDetails?.specialRequests || []
    };
    
    // Booking status and workflow
    this.status = data.status || 'pending'; // pending, confirmed, cancelled, completed, failed
    this.workflowState = data.workflowState || 'started'; // saga state
    this.subBookings = data.subBookings || {}; // Individual service bookings
    
    // Financial information
    this.pricing = {
      subtotal: data.pricing?.subtotal || 0,
      taxes: data.pricing?.taxes || 0,
      fees: data.pricing?.fees || 0,
      discounts: data.pricing?.discounts || 0,
      total: data.pricing?.total || 0,
      currency: data.pricing?.currency || 'USD',
      breakdown: data.pricing?.breakdown || {},
      paymentStatus: data.pricing?.paymentStatus || 'pending'
    };
    
    // Payment information
    this.payment = {
      method: data.payment?.method || null,
      provider: data.payment?.provider || null,
      transactionId: data.payment?.transactionId || null,
      paymentIntentId: data.payment?.paymentIntentId || null,
      status: data.payment?.status || 'pending',
      paidAmount: data.payment?.paidAmount || 0,
      refundAmount: data.payment?.refundAmount || 0,
      installments: data.payment?.installments || [],
      billingAddress: data.payment?.billingAddress || {}
    };
    
    // Saga transaction management
    this.saga = {
      transactionId: data.saga?.transactionId || uuidv4(),
      currentStep: data.saga?.currentStep || 0,
      totalSteps: data.saga?.totalSteps || 0,
      completedSteps: data.saga?.completedSteps || [],
      failedSteps: data.saga?.failedSteps || [],
      compensationActions: data.saga?.compensationActions || [],
      isCompensating: data.saga?.isCompensating || false,
      lastError: data.saga?.lastError || null,
      retryCount: data.saga?.retryCount || 0,
      maxRetries: data.saga?.maxRetries || 3
    };
    
    // Service coordination
    this.services = {
      flight: {
        required: data.services?.flight?.required || false,
        status: data.services?.flight?.status || 'not_started',
        serviceBookingId: data.services?.flight?.serviceBookingId || null,
        confirmationNumber: data.services?.flight?.confirmationNumber || null,
        error: data.services?.flight?.error || null,
        retryCount: data.services?.flight?.retryCount || 0
      },
      hotel: {
        required: data.services?.hotel?.required || false,
        status: data.services?.hotel?.status || 'not_started',
        serviceBookingId: data.services?.hotel?.serviceBookingId || null,
        confirmationNumber: data.services?.hotel?.confirmationNumber || null,
        error: data.services?.hotel?.error || null,
        retryCount: data.services?.hotel?.retryCount || 0
      },
      car: {
        required: data.services?.car?.required || false,
        status: data.services?.car?.status || 'not_started',
        serviceBookingId: data.services?.car?.serviceBookingId || null,
        confirmationNumber: data.services?.car?.confirmationNumber || null,
        error: data.services?.car?.error || null,
        retryCount: data.services?.car?.retryCount || 0
      },
      payment: {
        required: true,
        status: data.services?.payment?.status || 'not_started',
        serviceTransactionId: data.services?.payment?.serviceTransactionId || null,
        error: data.services?.payment?.error || null,
        retryCount: data.services?.payment?.retryCount || 0
      },
      notification: {
        required: true,
        status: data.services?.notification?.status || 'not_started',
        messageIds: data.services?.notification?.messageIds || [],
        error: data.services?.notification?.error || null,
        retryCount: data.services?.notification?.retryCount || 0
      }
    };
    
    // Policy and rules
    this.policies = {
      cancellation: data.policies?.cancellation || {},
      modification: data.policies?.modification || {},
      refund: data.policies?.refund || {},
      noShow: data.policies?.noShow || {},
      cancellationDeadline: data.policies?.cancellationDeadline || null,
      modificationDeadline: data.policies?.modificationDeadline || null
    };
    
    // Insurance and protection
    this.insurance = {
      travel: data.insurance?.travel || null,
      cancellation: data.insurance?.cancellation || null,
      medical: data.insurance?.medical || null,
      baggage: data.insurance?.baggage || null,
      totalCost: data.insurance?.totalCost || 0
    };
    
    // Loyalty and promotions
    this.loyalty = {
      pointsEarned: data.loyalty?.pointsEarned || 0,
      pointsRedeemed: data.loyalty?.pointsRedeemed || 0,
      tier: data.loyalty?.tier || null,
      benefits: data.loyalty?.benefits || []
    };
    
    this.promotions = data.promotions || [];
    this.coupons = data.coupons || [];
    
    // Booking lifecycle
    this.lifecycle = {
      bookingDate: data.lifecycle?.bookingDate || new Date(),
      confirmationDate: data.lifecycle?.confirmationDate || null,
      cancellationDate: data.lifecycle?.cancellationDate || null,
      completionDate: data.lifecycle?.completionDate || null,
      expiryDate: data.lifecycle?.expiryDate || null,
      lastModified: data.lifecycle?.lastModified || new Date(),
      source: data.lifecycle?.source || 'web', // web, mobile, api, agent
      channel: data.lifecycle?.channel || 'direct'
    };
    
    // Communication and notifications
    this.communication = {
      preferredLanguage: data.communication?.preferredLanguage || 'en',
      notifications: {
        email: data.communication?.notifications?.email || true,
        sms: data.communication?.notifications?.sms || false,
        push: data.communication?.notifications?.push || true,
        whatsapp: data.communication?.notifications?.whatsapp || false
      },
      emailAddress: data.communication?.emailAddress || '',
      phoneNumber: data.communication?.phoneNumber || '',
      emergencyContact: data.communication?.emergencyContact || {}
    };
    
    // Audit trail
    this.auditTrail = data.auditTrail || [];
    this.modifications = data.modifications || [];
    this.cancellations = data.cancellations || [];
    
    // Metadata
    this.metadata = {
      userAgent: data.metadata?.userAgent || '',
      ipAddress: data.metadata?.ipAddress || '',
      sessionId: data.metadata?.sessionId || '',
      affiliateId: data.metadata?.affiliateId || null,
      campaignId: data.metadata?.campaignId || null,
      referrer: data.metadata?.referrer || '',
      device: data.metadata?.device || 'unknown'
    };
    
    // Timestamps
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }
  
  // Validation methods
  validate() {
    const errors = [];
    
    if (!this.customerId) {
      errors.push('Customer ID is required');
    }
    
    if (!this.components || Object.keys(this.components).length === 0) {
      errors.push('At least one booking component is required');
    }
    
    if (this.guestDetails.adults < 1) {
      errors.push('At least one adult guest is required');
    }
    
    if (this.guestDetails.rooms < 1) {
      errors.push('At least one room is required');
    }
    
    if (this.pricing.total < 0) {
      errors.push('Total price cannot be negative');
    }
    
    // Validate passenger count vs guest count
    const totalPassengers = this.passengers.length;
    const expectedPassengers = this.guestDetails.adults + this.guestDetails.children;
    if (this.services.flight.required && totalPassengers !== expectedPassengers) {
      errors.push('Passenger count must match guest count for flights');
    }
    
    // Validate travel dates
    if (this.travel.departure.date && this.travel.return.date) {
      const departureDate = new Date(this.travel.departure.date);
      const returnDate = new Date(this.travel.return.date);
      
      if (departureDate >= returnDate) {
        errors.push('Return date must be after departure date');
      }
    }
    
    return errors;
  }
  
  // Saga state management
  startSaga(steps) {
    this.saga.totalSteps = steps.length;
    this.saga.currentStep = 0;
    this.saga.completedSteps = [];
    this.saga.failedSteps = [];
    this.saga.isCompensating = false;
    this.workflowState = 'in_progress';
    this.updatedAt = new Date();
    
    this.addAuditEntry('saga_started', { totalSteps: steps.length });
  }
  
  completeStep(stepName, result) {
    this.saga.completedSteps.push({
      step: stepName,
      result,
      completedAt: new Date()
    });
    this.saga.currentStep++;
    this.updatedAt = new Date();
    
    this.addAuditEntry('saga_step_completed', { step: stepName, currentStep: this.saga.currentStep });
  }
  
  failStep(stepName, error) {
    this.saga.failedSteps.push({
      step: stepName,
      error: error.message || error,
      failedAt: new Date()
    });
    this.saga.lastError = error.message || error;
    this.saga.retryCount++;
    this.updatedAt = new Date();
    
    this.addAuditEntry('saga_step_failed', { step: stepName, error: error.message || error });
  }
  
  startCompensation() {
    this.saga.isCompensating = true;
    this.workflowState = 'compensating';
    this.updatedAt = new Date();
    
    this.addAuditEntry('saga_compensation_started', { completedSteps: this.saga.completedSteps.length });
  }
  
  completeCompensation(action) {
    this.saga.compensationActions.push({
      action,
      completedAt: new Date()
    });
    this.updatedAt = new Date();
    
    this.addAuditEntry('saga_compensation_completed', { action });
  }
  
  completeSaga() {
    this.workflowState = 'completed';
    this.status = 'confirmed';
    this.lifecycle.confirmationDate = new Date();
    this.updatedAt = new Date();
    
    this.addAuditEntry('saga_completed', { totalSteps: this.saga.totalSteps });
  }
  
  failSaga() {
    this.workflowState = 'failed';
    this.status = 'failed';
    this.updatedAt = new Date();
    
    this.addAuditEntry('saga_failed', { error: this.saga.lastError });
  }
  
  // Service status management
  updateServiceStatus(serviceName, status, details = {}) {
    if (this.services[serviceName]) {
      this.services[serviceName].status = status;
      
      if (details.serviceBookingId) {
        this.services[serviceName].serviceBookingId = details.serviceBookingId;
      }
      
      if (details.confirmationNumber) {
        this.services[serviceName].confirmationNumber = details.confirmationNumber;
      }
      
      if (details.error) {
        this.services[serviceName].error = details.error;
        this.services[serviceName].retryCount++;
      }
      
      this.updatedAt = new Date();
      this.addAuditEntry('service_status_updated', { service: serviceName, status, details });
    }
  }
  
  // Status management
  setConfirmed() {
    this.status = 'confirmed';
    this.lifecycle.confirmationDate = new Date();
    this.updatedAt = new Date();
    
    this.addAuditEntry('booking_confirmed');
  }
  
  setCancelled(reason, refundAmount = 0) {
    this.status = 'cancelled';
    this.lifecycle.cancellationDate = new Date();
    this.payment.refundAmount = refundAmount;
    this.updatedAt = new Date();
    
    this.cancellations.push({
      id: uuidv4(),
      reason,
      refundAmount,
      cancelledAt: new Date(),
      cancelledBy: 'system' // Could be customer, agent, system
    });
    
    this.addAuditEntry('booking_cancelled', { reason, refundAmount });
  }
  
  setCompleted() {
    this.status = 'completed';
    this.lifecycle.completionDate = new Date();
    this.updatedAt = new Date();
    
    this.addAuditEntry('booking_completed');
  }
  
  // Financial methods
  updatePricing(pricingData) {
    this.pricing = { ...this.pricing, ...pricingData };
    this.pricing.total = this.pricing.subtotal + this.pricing.taxes + this.pricing.fees - this.pricing.discounts;
    this.updatedAt = new Date();
    
    this.addAuditEntry('pricing_updated', pricingData);
  }
  
  updatePaymentStatus(status, details = {}) {
    this.payment.status = status;
    
    if (details.transactionId) {
      this.payment.transactionId = details.transactionId;
    }
    
    if (details.paidAmount) {
      this.payment.paidAmount = details.paidAmount;
    }
    
    if (details.method) {
      this.payment.method = details.method;
    }
    
    this.pricing.paymentStatus = status;
    this.updatedAt = new Date();
    
    this.addAuditEntry('payment_status_updated', { status, details });
  }
  
  // Modification methods
  addModification(modificationType, changes, cost = 0) {
    const modification = {
      id: uuidv4(),
      type: modificationType,
      changes,
      cost,
      requestedAt: new Date(),
      status: 'pending'
    };
    
    this.modifications.push(modification);
    this.updatedAt = new Date();
    
    this.addAuditEntry('modification_requested', { modificationType, changes, cost });
    
    return modification;
  }
  
  // Utility methods
  generateBookingNumber() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TK${timestamp}${random}`;
  }
  
  addAuditEntry(action, details = {}) {
    this.auditTrail.push({
      id: uuidv4(),
      action,
      details,
      timestamp: new Date(),
      user: 'system' // Could be customer, agent, system
    });
  }
  
  getDuration() {
    if (this.travel.departure.date && this.travel.return.date) {
      const departure = new Date(this.travel.departure.date);
      const returnDate = new Date(this.travel.return.date);
      return Math.ceil((returnDate - departure) / (1000 * 60 * 60 * 24));
    }
    return this.travel.duration || 0;
  }
  
  getTotalPassengers() {
    return this.guestDetails.adults + this.guestDetails.children + this.guestDetails.infants;
  }
  
  canBeCancelled() {
    if (this.status === 'cancelled' || this.status === 'completed') {
      return false;
    }
    
    if (this.policies.cancellationDeadline) {
      const deadline = new Date(this.policies.cancellationDeadline);
      return new Date() < deadline;
    }
    
    return true;
  }
  
  canBeModified() {
    if (this.status === 'cancelled' || this.status === 'completed') {
      return false;
    }
    
    if (this.policies.modificationDeadline) {
      const deadline = new Date(this.policies.modificationDeadline);
      return new Date() < deadline;
    }
    
    return true;
  }
  
  // Transform methods
  toPublicJson() {
    return {
      id: this.id,
      bookingNumber: this.bookingNumber,
      type: this.type,
      status: this.status,
      travel: this.travel,
      guestDetails: this.guestDetails,
      pricing: this.pricing,
      payment: {
        status: this.payment.status,
        method: this.payment.method,
        paidAmount: this.payment.paidAmount
      },
      policies: this.policies,
      insurance: this.insurance,
      lifecycle: this.lifecycle,
      communication: this.communication,
      components: this.components,
      services: Object.keys(this.services).reduce((acc, service) => {
        if (this.services[service].required) {
          acc[service] = {
            status: this.services[service].status,
            confirmationNumber: this.services[service].confirmationNumber
          };
        }
        return acc;
      }, {}),
      canBeCancelled: this.canBeCancelled(),
      canBeModified: this.canBeModified(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
  
  toSagaJson() {
    return {
      id: this.id,
      saga: this.saga,
      services: this.services,
      workflowState: this.workflowState,
      status: this.status,
      pricing: this.pricing,
      components: this.components,
      auditTrail: this.auditTrail,
      updatedAt: this.updatedAt
    };
  }
  
  toAnalyticsJson() {
    return {
      id: this.id,
      type: this.type,
      status: this.status,
      pricing: {
        total: this.pricing.total,
        currency: this.pricing.currency
      },
      duration: this.getDuration(),
      totalPassengers: this.getTotalPassengers(),
      services: Object.keys(this.services).filter(service => this.services[service].required),
      bookingDate: this.lifecycle.bookingDate,
      source: this.lifecycle.source,
      channel: this.lifecycle.channel,
      location: this.travel.departure.location,
      destination: this.travel.return.location
    };
  }
}

module.exports = Booking;