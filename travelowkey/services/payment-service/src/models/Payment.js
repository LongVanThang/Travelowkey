const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class Payment {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.transactionId = data.transactionId || this.generateTransactionId();
    this.bookingId = data.bookingId;
    this.customerId = data.customerId;
    
    // Payment basic information
    this.amount = data.amount || 0;
    this.currency = data.currency || 'USD';
    this.description = data.description || '';
    this.reference = data.reference || '';
    
    // Payment status and lifecycle
    this.status = data.status || 'pending'; // pending, authorized, captured, failed, cancelled, refunded, partially_refunded
    this.paymentFlow = data.paymentFlow || 'standard'; // standard, installment, subscription, recurring
    this.intent = data.intent || 'capture'; // authorize, capture
    
    // Provider information
    this.provider = data.provider || 'stripe'; // stripe, paypal, adyen, razorpay
    this.providerTransactionId = data.providerTransactionId || null;
    this.providerSessionId = data.providerSessionId || null;
    this.providerCustomerId = data.providerCustomerId || null;
    this.providerMetadata = data.providerMetadata || {};
    
    // Payment method details
    this.paymentMethod = {
      type: data.paymentMethod?.type || null, // card, wallet, bank_transfer, crypto
      brand: data.paymentMethod?.brand || null, // visa, mastercard, amex, discover
      last4: data.paymentMethod?.last4 || null,
      expiryMonth: data.paymentMethod?.expiryMonth || null,
      expiryYear: data.paymentMethod?.expiryYear || null,
      fingerprint: data.paymentMethod?.fingerprint || null,
      country: data.paymentMethod?.country || null,
      funding: data.paymentMethod?.funding || null, // credit, debit, prepaid
      wallet: data.paymentMethod?.wallet || null, // apple_pay, google_pay, samsung_pay
      bankName: data.paymentMethod?.bankName || null,
      accountType: data.paymentMethod?.accountType || null
    };
    
    // Billing information
    this.billingAddress = {
      firstName: data.billingAddress?.firstName || '',
      lastName: data.billingAddress?.lastName || '',
      email: data.billingAddress?.email || '',
      phone: data.billingAddress?.phone || '',
      line1: data.billingAddress?.line1 || '',
      line2: data.billingAddress?.line2 || '',
      city: data.billingAddress?.city || '',
      state: data.billingAddress?.state || '',
      postalCode: data.billingAddress?.postalCode || '',
      country: data.billingAddress?.country || '',
      company: data.billingAddress?.company || ''
    };
    
    // Financial breakdown
    this.breakdown = {
      subtotal: data.breakdown?.subtotal || 0,
      tax: data.breakdown?.tax || 0,
      fees: data.breakdown?.fees || 0,
      discount: data.breakdown?.discount || 0,
      tip: data.breakdown?.tip || 0,
      shipping: data.breakdown?.shipping || 0,
      insurance: data.breakdown?.insurance || 0,
      processingFee: data.breakdown?.processingFee || 0
    };
    
    // Authorization and capture
    this.authorization = {
      authorizationId: data.authorization?.authorizationId || null,
      authorizedAmount: data.authorization?.authorizedAmount || 0,
      authorizedAt: data.authorization?.authorizedAt || null,
      expiresAt: data.authorization?.expiresAt || null,
      capturedAmount: data.authorization?.capturedAmount || 0,
      capturedAt: data.authorization?.capturedAt || null,
      remainingAmount: data.authorization?.remainingAmount || 0,
      canCapture: data.authorization?.canCapture || false
    };
    
    // Refund information
    this.refunds = data.refunds || [];
    this.totalRefunded = data.totalRefunded || 0;
    this.refundReason = data.refundReason || null;
    this.refundableAmount = data.refundableAmount || 0;
    
    // Installment information
    this.installments = {
      enabled: data.installments?.enabled || false,
      totalInstallments: data.installments?.totalInstallments || 1,
      currentInstallment: data.installments?.currentInstallment || 1,
      installmentAmount: data.installments?.installmentAmount || 0,
      schedule: data.installments?.schedule || [],
      nextPaymentDate: data.installments?.nextPaymentDate || null
    };
    
    // Fraud detection and security
    this.fraudDetection = {
      score: data.fraudDetection?.score || 0,
      riskLevel: data.fraudDetection?.riskLevel || 'low', // low, medium, high, critical
      checks: data.fraudDetection?.checks || [],
      ipAddress: data.fraudDetection?.ipAddress || '',
      userAgent: data.fraudDetection?.userAgent || '',
      deviceFingerprint: data.fraudDetection?.deviceFingerprint || '',
      geoLocation: data.fraudDetection?.geoLocation || {},
      velocityChecks: data.fraudDetection?.velocityChecks || {},
      blacklistStatus: data.fraudDetection?.blacklistStatus || 'clean',
      whitelistStatus: data.fraudDetection?.whitelistStatus || 'unknown'
    };
    
    // 3D Secure authentication
    this.threeDSecure = {
      enabled: data.threeDSecure?.enabled || false,
      version: data.threeDSecure?.version || null,
      status: data.threeDSecure?.status || null, // authenticated, not_authenticated, attempted, failed
      authenticationId: data.threeDSecure?.authenticationId || null,
      eci: data.threeDSecure?.eci || null,
      cavv: data.threeDSecure?.cavv || null,
      xid: data.threeDSecure?.xid || null,
      liabilityShift: data.threeDSecure?.liabilityShift || false
    };
    
    // Payment processing details
    this.processing = {
      gateway: data.processing?.gateway || '',
      acquirer: data.processing?.acquirer || '',
      authCode: data.processing?.authCode || '',
      avsResult: data.processing?.avsResult || '',
      cvvResult: data.processing?.cvvResult || '',
      networkTransactionId: data.processing?.networkTransactionId || '',
      processorResponseCode: data.processing?.processorResponseCode || '',
      processorResponseText: data.processing?.processorResponseText || '',
      settlementDate: data.processing?.settlementDate || null
    };
    
    // Fee structure
    this.fees = {
      processingFee: data.fees?.processingFee || 0,
      gatewayFee: data.fees?.gatewayFee || 0,
      networkFee: data.fees?.networkFee || 0,
      acquirerFee: data.fees?.acquirerFee || 0,
      totalFees: data.fees?.totalFees || 0,
      feeBreakdown: data.fees?.feeBreakdown || []
    };
    
    // Compliance and regulatory
    this.compliance = {
      pciCompliant: data.compliance?.pciCompliant || true,
      kycStatus: data.compliance?.kycStatus || 'not_required',
      amlStatus: data.compliance?.amlStatus || 'not_required',
      taxReporting: data.compliance?.taxReporting || {},
      regulations: data.compliance?.regulations || []
    };
    
    // Webhook and notifications
    this.webhooks = {
      sent: data.webhooks?.sent || [],
      pending: data.webhooks?.pending || [],
      failed: data.webhooks?.failed || []
    };
    
    // Retry and failure handling
    this.retries = {
      count: data.retries?.count || 0,
      maxRetries: data.retries?.maxRetries || 3,
      nextRetryAt: data.retries?.nextRetryAt || null,
      lastError: data.retries?.lastError || null,
      failureReason: data.retries?.failureReason || null
    };
    
    // Customer interaction
    this.customer = {
      ipAddress: data.customer?.ipAddress || '',
      userAgent: data.customer?.userAgent || '',
      sessionId: data.customer?.sessionId || '',
      fingerprint: data.customer?.fingerprint || '',
      locale: data.customer?.locale || 'en',
      timezone: data.customer?.timezone || 'UTC'
    };
    
    // Reconciliation
    this.reconciliation = {
      batchId: data.reconciliation?.batchId || null,
      settledAmount: data.reconciliation?.settledAmount || 0,
      settledCurrency: data.reconciliation?.settledCurrency || this.currency,
      exchangeRate: data.reconciliation?.exchangeRate || 1,
      settlementFee: data.reconciliation?.settlementFee || 0,
      reconciledAt: data.reconciliation?.reconciledAt || null,
      discrepancies: data.reconciliation?.discrepancies || []
    };
    
    // Audit trail
    this.auditTrail = data.auditTrail || [];
    this.events = data.events || [];
    
    // Metadata
    this.metadata = data.metadata || {};
    this.tags = data.tags || [];
    this.notes = data.notes || '';
    
    // Timestamps
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.processedAt = data.processedAt || null;
    this.settledAt = data.settledAt || null;
    this.expiresAt = data.expiresAt || null;
  }
  
  // Validation methods
  validate() {
    const errors = [];
    
    if (this.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }
    
    if (!this.currency || this.currency.length !== 3) {
      errors.push('Valid 3-character currency code is required');
    }
    
    if (!this.customerId) {
      errors.push('Customer ID is required');
    }
    
    if (!this.bookingId) {
      errors.push('Booking ID is required');
    }
    
    if (!this.provider) {
      errors.push('Payment provider is required');
    }
    
    // Validate billing address for card payments
    if (this.paymentMethod.type === 'card') {
      if (!this.billingAddress.firstName || !this.billingAddress.lastName) {
        errors.push('First name and last name are required for card payments');
      }
      
      if (!this.billingAddress.line1 || !this.billingAddress.city || !this.billingAddress.country) {
        errors.push('Complete billing address is required for card payments');
      }
    }
    
    return errors;
  }
  
  // State management methods
  setPending() {
    this.status = 'pending';
    this.updatedAt = new Date();
    this.addEvent('payment_pending', { status: 'pending' });
  }
  
  setAuthorized(authorizationData) {
    this.status = 'authorized';
    this.authorization.authorizationId = authorizationData.authorizationId;
    this.authorization.authorizedAmount = authorizationData.amount || this.amount;
    this.authorization.authorizedAt = new Date();
    this.authorization.expiresAt = authorizationData.expiresAt;
    this.authorization.canCapture = true;
    this.authorization.remainingAmount = this.authorization.authorizedAmount;
    this.providerTransactionId = authorizationData.providerTransactionId;
    this.updatedAt = new Date();
    
    this.addEvent('payment_authorized', authorizationData);
  }
  
  setCaptured(captureData) {
    this.status = 'captured';
    this.authorization.capturedAmount += captureData.amount || this.authorization.remainingAmount;
    this.authorization.capturedAt = new Date();
    this.authorization.remainingAmount = this.authorization.authorizedAmount - this.authorization.capturedAmount;
    this.authorization.canCapture = this.authorization.remainingAmount > 0;
    this.processedAt = new Date();
    this.updatedAt = new Date();
    
    this.addEvent('payment_captured', captureData);
  }
  
  setFailed(error) {
    this.status = 'failed';
    this.retries.failureReason = error.message || error;
    this.retries.lastError = error;
    this.updatedAt = new Date();
    
    this.addEvent('payment_failed', { error: error.message || error });
  }
  
  setCancelled(reason) {
    this.status = 'cancelled';
    this.updatedAt = new Date();
    
    this.addEvent('payment_cancelled', { reason });
  }
  
  // Refund management
  addRefund(refundData) {
    const refund = {
      id: uuidv4(),
      amount: refundData.amount,
      currency: refundData.currency || this.currency,
      reason: refundData.reason || 'requested_by_customer',
      status: 'pending',
      providerRefundId: refundData.providerRefundId,
      createdAt: new Date(),
      processedAt: null
    };
    
    this.refunds.push(refund);
    this.totalRefunded += refundData.amount;
    this.refundableAmount = this.authorization.capturedAmount - this.totalRefunded;
    
    if (this.totalRefunded >= this.authorization.capturedAmount) {
      this.status = 'refunded';
    } else if (this.totalRefunded > 0) {
      this.status = 'partially_refunded';
    }
    
    this.updatedAt = new Date();
    this.addEvent('refund_created', refund);
    
    return refund;
  }
  
  updateRefundStatus(refundId, status, processedAt = null) {
    const refund = this.refunds.find(r => r.id === refundId);
    if (refund) {
      refund.status = status;
      if (processedAt) {
        refund.processedAt = processedAt;
      }
      this.updatedAt = new Date();
      
      this.addEvent('refund_updated', { refundId, status });
    }
  }
  
  // Fraud detection methods
  updateFraudScore(score, riskLevel, checks = []) {
    this.fraudDetection.score = score;
    this.fraudDetection.riskLevel = riskLevel;
    this.fraudDetection.checks = checks;
    this.updatedAt = new Date();
    
    this.addEvent('fraud_check_completed', { score, riskLevel, checks });
  }
  
  addFraudCheck(checkType, result, details = {}) {
    this.fraudDetection.checks.push({
      type: checkType,
      result,
      details,
      checkedAt: new Date()
    });
    this.updatedAt = new Date();
  }
  
  // 3D Secure methods
  set3DSecureStatus(status, details = {}) {
    this.threeDSecure.status = status;
    this.threeDSecure.authenticationId = details.authenticationId;
    this.threeDSecure.eci = details.eci;
    this.threeDSecure.cavv = details.cavv;
    this.threeDSecure.xid = details.xid;
    this.threeDSecure.liabilityShift = details.liabilityShift || false;
    this.updatedAt = new Date();
    
    this.addEvent('3ds_authentication', { status, details });
  }
  
  // Installment management
  setupInstallments(totalInstallments, installmentAmount, schedule) {
    this.installments.enabled = true;
    this.installments.totalInstallments = totalInstallments;
    this.installments.installmentAmount = installmentAmount;
    this.installments.schedule = schedule;
    this.installments.nextPaymentDate = schedule[0]?.date;
    this.paymentFlow = 'installment';
    this.updatedAt = new Date();
    
    this.addEvent('installments_setup', { totalInstallments, installmentAmount });
  }
  
  processNextInstallment() {
    if (this.installments.enabled && this.installments.currentInstallment < this.installments.totalInstallments) {
      this.installments.currentInstallment++;
      
      const nextSchedule = this.installments.schedule[this.installments.currentInstallment];
      this.installments.nextPaymentDate = nextSchedule?.date || null;
      
      this.updatedAt = new Date();
      this.addEvent('installment_processed', { installmentNumber: this.installments.currentInstallment });
    }
  }
  
  // Utility methods
  generateTransactionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TXN${timestamp}${random}`;
  }
  
  calculateTotalFees() {
    this.fees.totalFees = this.fees.processingFee + this.fees.gatewayFee + this.fees.networkFee + this.fees.acquirerFee;
    return this.fees.totalFees;
  }
  
  calculateNetAmount() {
    return this.amount - this.calculateTotalFees();
  }
  
  isExpired() {
    return this.expiresAt && new Date() > new Date(this.expiresAt);
  }
  
  canBeRefunded() {
    return this.status === 'captured' && this.refundableAmount > 0;
  }
  
  canBeCaptured() {
    return this.status === 'authorized' && this.authorization.canCapture && !this.isExpired();
  }
  
  isRecurring() {
    return this.paymentFlow === 'recurring' || this.paymentFlow === 'subscription';
  }
  
  getPaymentAge() {
    return Date.now() - this.createdAt.getTime();
  }
  
  // Event tracking
  addEvent(eventType, data = {}) {
    this.events.push({
      id: uuidv4(),
      type: eventType,
      data,
      timestamp: new Date()
    });
    
    this.auditTrail.push({
      action: eventType,
      data,
      timestamp: new Date(),
      user: 'system'
    });
  }
  
  // Encryption methods for sensitive data
  encryptSensitiveData(key) {
    // Encrypt sensitive payment method data
    if (this.paymentMethod.last4) {
      // In production, use proper encryption
      this.paymentMethod.fingerprint = this.generateFingerprint();
    }
  }
  
  generateFingerprint() {
    const data = `${this.paymentMethod.brand}${this.paymentMethod.last4}${this.paymentMethod.expiryMonth}${this.paymentMethod.expiryYear}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }
  
  // Transform methods
  toPublicJson() {
    return {
      id: this.id,
      transactionId: this.transactionId,
      bookingId: this.bookingId,
      amount: this.amount,
      currency: this.currency,
      status: this.status,
      paymentFlow: this.paymentFlow,
      paymentMethod: {
        type: this.paymentMethod.type,
        brand: this.paymentMethod.brand,
        last4: this.paymentMethod.last4,
        expiryMonth: this.paymentMethod.expiryMonth,
        expiryYear: this.paymentMethod.expiryYear
      },
      breakdown: this.breakdown,
      totalRefunded: this.totalRefunded,
      refundableAmount: this.refundableAmount,
      installments: this.installments.enabled ? {
        totalInstallments: this.installments.totalInstallments,
        currentInstallment: this.installments.currentInstallment,
        nextPaymentDate: this.installments.nextPaymentDate
      } : null,
      fraudDetection: {
        riskLevel: this.fraudDetection.riskLevel
      },
      threeDSecure: {
        enabled: this.threeDSecure.enabled,
        status: this.threeDSecure.status,
        liabilityShift: this.threeDSecure.liabilityShift
      },
      canBeRefunded: this.canBeRefunded(),
      canBeCaptured: this.canBeCaptured(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      processedAt: this.processedAt
    };
  }
  
  toProviderJson() {
    return {
      id: this.id,
      transactionId: this.transactionId,
      amount: this.amount,
      currency: this.currency,
      description: this.description,
      customerId: this.customerId,
      paymentMethod: this.paymentMethod,
      billingAddress: this.billingAddress,
      metadata: this.metadata,
      threeDSecure: this.threeDSecure
    };
  }
  
  toAuditJson() {
    return {
      id: this.id,
      transactionId: this.transactionId,
      bookingId: this.bookingId,
      customerId: this.customerId,
      amount: this.amount,
      currency: this.currency,
      status: this.status,
      provider: this.provider,
      paymentMethod: {
        type: this.paymentMethod.type,
        brand: this.paymentMethod.brand,
        last4: this.paymentMethod.last4
      },
      fraudDetection: this.fraudDetection,
      auditTrail: this.auditTrail,
      events: this.events,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
  
  toReconciliationJson() {
    return {
      id: this.id,
      transactionId: this.transactionId,
      amount: this.amount,
      currency: this.currency,
      status: this.status,
      provider: this.provider,
      providerTransactionId: this.providerTransactionId,
      fees: this.fees,
      reconciliation: this.reconciliation,
      settlementDate: this.processing.settlementDate,
      createdAt: this.createdAt,
      processedAt: this.processedAt
    };
  }
}

module.exports = Payment;