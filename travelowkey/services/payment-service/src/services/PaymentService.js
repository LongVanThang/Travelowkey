const Payment = require('../models/Payment');
const StripeProvider = require('./providers/StripeProvider');
const PayPalProvider = require('./providers/PayPalProvider');
const FraudDetectionService = require('./FraudDetectionService');
const WebhookService = require('./WebhookService');
const ReconciliationService = require('./ReconciliationService');
const logger = require('../utils/logger');
const { publishEvent } = require('../config/kafka');
const redis = require('../config/redis');

class PaymentService {
  constructor() {
    this.providers = {
      stripe: new StripeProvider(),
      paypal: new PayPalProvider()
    };
    
    this.fraudDetectionService = new FraudDetectionService();
    this.webhookService = new WebhookService();
    this.reconciliationService = new ReconciliationService();
    
    // Payment configurations
    this.config = {
      defaultProvider: 'stripe',
      fallbackProvider: 'paypal',
      maxRetries: 3,
      retryDelay: 5000,
      authorizationTimeout: 300000, // 5 minutes
      captureTimeout: 604800000, // 7 days
      fraudScoreThreshold: 75,
      highRiskThreshold: 90,
      autoCapture: false,
      enable3DSecure: true,
      enableFraudDetection: true
    };
  }
  
  // Main payment processing methods
  async createPayment(paymentData) {
    try {
      logger.info('Creating new payment', { bookingId: paymentData.bookingId });
      
      // Create payment instance
      const payment = new Payment(paymentData);
      
      // Validate payment data
      const validationErrors = payment.validate();
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }
      
      // Set customer context
      await this.setCustomerContext(payment, paymentData.customerContext);
      
      // Run fraud detection if enabled
      if (this.config.enableFraudDetection) {
        await this.runFraudDetection(payment);
        
        // Check if payment should be blocked
        if (payment.fraudDetection.riskLevel === 'critical' || 
            payment.fraudDetection.score > this.config.highRiskThreshold) {
          payment.setFailed({ message: 'Payment blocked due to high fraud risk' });
          await this.savePayment(payment);
          await this.publishPaymentEvent('payment_blocked', payment);
          throw new Error('Payment blocked due to security concerns');
        }
      }
      
      // Save initial payment
      await this.savePayment(payment);
      
      // Publish payment created event
      await this.publishPaymentEvent('payment_created', payment);
      
      logger.info('Payment created successfully', { paymentId: payment.id });
      return payment;
      
    } catch (error) {
      logger.error('Failed to create payment', { error: error.message, paymentData });
      throw error;
    }
  }
  
  async processPayment(paymentId, processingOptions = {}) {
    try {
      logger.info('Processing payment', { paymentId });
      
      const payment = await this.getPayment(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }
      
      if (payment.status !== 'pending') {
        throw new Error(`Payment cannot be processed. Current status: ${payment.status}`);
      }
      
      // Determine provider
      const provider = this.getProvider(payment.provider);
      
      // Check if 3D Secure is required
      if (this.shouldRequire3DSecure(payment)) {
        return await this.handle3DSecure(payment, provider, processingOptions);
      }
      
      // Process payment based on intent
      let result;
      if (payment.intent === 'authorize') {
        result = await this.authorizePayment(payment, provider, processingOptions);
      } else {
        result = await this.capturePayment(payment, provider, processingOptions);
      }
      
      await this.savePayment(payment);
      await this.publishPaymentEvent('payment_processed', payment);
      
      logger.info('Payment processed successfully', { paymentId: payment.id, status: payment.status });
      return result;
      
    } catch (error) {
      logger.error('Failed to process payment', { paymentId, error: error.message });
      
      const payment = await this.getPayment(paymentId);
      if (payment) {
        payment.setFailed(error);
        await this.savePayment(payment);
        await this.publishPaymentEvent('payment_failed', payment);
      }
      
      throw error;
    }
  }
  
  async authorizePayment(payment, provider, options = {}) {
    try {
      logger.info('Authorizing payment', { paymentId: payment.id });
      
      // Prepare authorization request
      const authRequest = {
        ...payment.toProviderJson(),
        captureMethod: 'manual',
        confirmationMethod: options.confirmationMethod || 'automatic',
        returnUrl: options.returnUrl,
        threeDSecure: payment.threeDSecure
      };
      
      // Call provider authorization
      const authResult = await provider.authorize(authRequest);
      
      // Update payment with authorization result
      payment.setAuthorized({
        authorizationId: authResult.authorizationId,
        amount: authResult.authorizedAmount || payment.amount,
        providerTransactionId: authResult.transactionId,
        expiresAt: new Date(Date.now() + this.config.captureTimeout)
      });
      
      // Update processing details
      this.updateProcessingDetails(payment, authResult);
      
      // Schedule auto-capture if configured
      if (this.config.autoCapture) {
        await this.scheduleAutoCapture(payment.id, options.captureDelay || 0);
      }
      
      return {
        status: 'authorized',
        authorizationId: authResult.authorizationId,
        payment: payment.toPublicJson()
      };
      
    } catch (error) {
      logger.error('Authorization failed', { paymentId: payment.id, error: error.message });
      throw error;
    }
  }
  
  async capturePayment(paymentOrId, amount = null, options = {}) {
    try {
      const payment = typeof paymentOrId === 'string' ? 
        await this.getPayment(paymentOrId) : paymentOrId;
      
      if (!payment) {
        throw new Error('Payment not found');
      }
      
      logger.info('Capturing payment', { paymentId: payment.id });
      
      // Validate capture conditions
      if (!payment.canBeCaptured()) {
        throw new Error('Payment cannot be captured');
      }
      
      const captureAmount = amount || payment.authorization.remainingAmount;
      
      if (captureAmount > payment.authorization.remainingAmount) {
        throw new Error('Capture amount exceeds authorized amount');
      }
      
      // Get provider and capture
      const provider = this.getProvider(payment.provider);
      const captureRequest = {
        authorizationId: payment.authorization.authorizationId,
        amount: captureAmount,
        currency: payment.currency,
        description: options.description || payment.description,
        metadata: options.metadata || {}
      };
      
      const captureResult = await provider.capture(captureRequest);
      
      // Update payment with capture result
      payment.setCaptured({
        amount: captureAmount,
        providerTransactionId: captureResult.transactionId
      });
      
      // Update processing details
      this.updateProcessingDetails(payment, captureResult);
      
      // Calculate and update fees
      await this.calculateFees(payment, captureResult);
      
      await this.savePayment(payment);
      await this.publishPaymentEvent('payment_captured', payment);
      
      logger.info('Payment captured successfully', { paymentId: payment.id, amount: captureAmount });
      
      return {
        status: 'captured',
        capturedAmount: captureAmount,
        payment: payment.toPublicJson()
      };
      
    } catch (error) {
      logger.error('Capture failed', { paymentId: payment?.id, error: error.message });
      throw error;
    }
  }
  
  async refundPayment(paymentId, refundData) {
    try {
      const payment = await this.getPayment(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }
      
      logger.info('Processing refund', { paymentId, amount: refundData.amount });
      
      // Validate refund conditions
      if (!payment.canBeRefunded()) {
        throw new Error('Payment cannot be refunded');
      }
      
      if (refundData.amount > payment.refundableAmount) {
        throw new Error('Refund amount exceeds refundable amount');
      }
      
      // Create refund record
      const refund = payment.addRefund(refundData);
      
      // Process refund with provider
      const provider = this.getProvider(payment.provider);
      const refundRequest = {
        transactionId: payment.providerTransactionId,
        amount: refundData.amount,
        currency: payment.currency,
        reason: refundData.reason,
        metadata: refundData.metadata || {}
      };
      
      const refundResult = await provider.refund(refundRequest);
      
      // Update refund with provider response
      refund.providerRefundId = refundResult.refundId;
      refund.status = refundResult.status || 'pending';
      
      if (refundResult.status === 'succeeded') {
        refund.processedAt = new Date();
      }
      
      await this.savePayment(payment);
      await this.publishPaymentEvent('payment_refunded', payment);
      
      logger.info('Refund processed successfully', { paymentId, refundId: refund.id });
      
      return {
        refund,
        payment: payment.toPublicJson()
      };
      
    } catch (error) {
      logger.error('Refund failed', { paymentId, error: error.message });
      throw error;
    }
  }
  
  async cancelPayment(paymentId, reason = 'requested_by_customer') {
    try {
      const payment = await this.getPayment(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }
      
      logger.info('Cancelling payment', { paymentId });
      
      // Check if payment can be cancelled
      if (!['pending', 'authorized'].includes(payment.status)) {
        throw new Error(`Cannot cancel payment with status: ${payment.status}`);
      }
      
      // Cancel with provider if needed
      const provider = this.getProvider(payment.provider);
      
      if (payment.status === 'authorized') {
        await provider.void({
          authorizationId: payment.authorization.authorizationId,
          reason
        });
      } else if (payment.providerTransactionId) {
        await provider.cancel({
          transactionId: payment.providerTransactionId,
          reason
        });
      }
      
      payment.setCancelled(reason);
      
      await this.savePayment(payment);
      await this.publishPaymentEvent('payment_cancelled', payment);
      
      logger.info('Payment cancelled successfully', { paymentId });
      
      return payment.toPublicJson();
      
    } catch (error) {
      logger.error('Cancel failed', { paymentId, error: error.message });
      throw error;
    }
  }
  
  // 3D Secure handling
  async handle3DSecure(payment, provider, options = {}) {
    try {
      logger.info('Initiating 3D Secure authentication', { paymentId: payment.id });
      
      const threeDSRequest = {
        ...payment.toProviderJson(),
        returnUrl: options.returnUrl || `${process.env.BASE_URL}/payments/${payment.id}/3ds-return`,
        challengeIndicator: options.challengeIndicator || 'request_if_needed'
      };
      
      const threeDSResult = await provider.create3DSecure(threeDSRequest);
      
      // Update payment with 3DS details
      payment.set3DSecureStatus('initiated', {
        authenticationId: threeDSResult.authenticationId,
        redirectUrl: threeDSResult.redirectUrl
      });
      
      await this.savePayment(payment);
      
      return {
        status: '3ds_required',
        redirectUrl: threeDSResult.redirectUrl,
        payment: payment.toPublicJson()
      };
      
    } catch (error) {
      logger.error('3D Secure initiation failed', { paymentId: payment.id, error: error.message });
      throw error;
    }
  }
  
  async complete3DSecure(paymentId, authenticationResult) {
    try {
      const payment = await this.getPayment(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }
      
      logger.info('Completing 3D Secure authentication', { paymentId });
      
      const provider = this.getProvider(payment.provider);
      
      // Verify 3DS authentication
      const verificationResult = await provider.verify3DSecure({
        authenticationId: payment.threeDSecure.authenticationId,
        authenticationResult
      });
      
      // Update 3DS status
      payment.set3DSecureStatus(verificationResult.status, {
        eci: verificationResult.eci,
        cavv: verificationResult.cavv,
        xid: verificationResult.xid,
        liabilityShift: verificationResult.liabilityShift
      });
      
      await this.savePayment(payment);
      
      // Continue with payment processing if authenticated
      if (verificationResult.status === 'authenticated') {
        return await this.processPayment(paymentId);
      }
      
      return {
        status: '3ds_' + verificationResult.status,
        payment: payment.toPublicJson()
      };
      
    } catch (error) {
      logger.error('3D Secure completion failed', { paymentId, error: error.message });
      throw error;
    }
  }
  
  // Fraud detection
  async runFraudDetection(payment) {
    try {
      logger.info('Running fraud detection', { paymentId: payment.id });
      
      const fraudResult = await this.fraudDetectionService.analyzePayment(payment);
      
      payment.updateFraudScore(
        fraudResult.score,
        fraudResult.riskLevel,
        fraudResult.checks
      );
      
      // Add specific fraud checks
      for (const check of fraudResult.checks) {
        payment.addFraudCheck(check.type, check.result, check.details);
      }
      
      logger.info('Fraud detection completed', { 
        paymentId: payment.id, 
        score: fraudResult.score, 
        riskLevel: fraudResult.riskLevel 
      });
      
    } catch (error) {
      logger.error('Fraud detection failed', { paymentId: payment.id, error: error.message });
      // Don't fail the payment, just log the error
      payment.addFraudCheck('system_error', 'failed', { error: error.message });
    }
  }
  
  // Helper methods
  getProvider(providerName) {
    const provider = this.providers[providerName];
    if (!provider) {
      throw new Error(`Payment provider not supported: ${providerName}`);
    }
    return provider;
  }
  
  shouldRequire3DSecure(payment) {
    if (!this.config.enable3DSecure) return false;
    if (payment.paymentMethod.type !== 'card') return false;
    
    // Check if 3DS is required based on amount, region, or risk
    const isHighValue = payment.amount > 100000; // $1000 threshold
    const isHighRisk = payment.fraudDetection.riskLevel === 'high';
    const isEuropeanCard = payment.paymentMethod.country && 
      ['GB', 'FR', 'DE', 'IT', 'ES', 'NL'].includes(payment.paymentMethod.country);
    
    return isHighValue || isHighRisk || isEuropeanCard;
  }
  
  async setCustomerContext(payment, customerContext) {
    if (customerContext) {
      payment.customer.ipAddress = customerContext.ipAddress;
      payment.customer.userAgent = customerContext.userAgent;
      payment.customer.sessionId = customerContext.sessionId;
      payment.customer.fingerprint = customerContext.fingerprint;
      payment.customer.locale = customerContext.locale;
      payment.customer.timezone = customerContext.timezone;
      
      payment.fraudDetection.ipAddress = customerContext.ipAddress;
      payment.fraudDetection.userAgent = customerContext.userAgent;
      payment.fraudDetection.deviceFingerprint = customerContext.fingerprint;
      payment.fraudDetection.geoLocation = customerContext.geoLocation || {};
    }
  }
  
  updateProcessingDetails(payment, providerResult) {
    if (providerResult.processing) {
      payment.processing.gateway = providerResult.processing.gateway;
      payment.processing.acquirer = providerResult.processing.acquirer;
      payment.processing.authCode = providerResult.processing.authCode;
      payment.processing.avsResult = providerResult.processing.avsResult;
      payment.processing.cvvResult = providerResult.processing.cvvResult;
      payment.processing.networkTransactionId = providerResult.processing.networkTransactionId;
      payment.processing.processorResponseCode = providerResult.processing.responseCode;
      payment.processing.processorResponseText = providerResult.processing.responseText;
    }
  }
  
  async calculateFees(payment, providerResult) {
    // Calculate fees based on provider and payment details
    const feeCalculation = {
      processingFee: Math.round(payment.amount * 0.029), // 2.9%
      gatewayFee: 30, // $0.30
      networkFee: payment.paymentMethod.type === 'card' ? 
        Math.round(payment.amount * 0.001) : 0, // 0.1% for cards
      acquirerFee: Math.round(payment.amount * 0.005) // 0.5%
    };
    
    payment.fees.processingFee = feeCalculation.processingFee;
    payment.fees.gatewayFee = feeCalculation.gatewayFee;
    payment.fees.networkFee = feeCalculation.networkFee;
    payment.fees.acquirerFee = feeCalculation.acquirerFee;
    payment.calculateTotalFees();
  }
  
  async scheduleAutoCapture(paymentId, delay = 0) {
    try {
      // Schedule auto-capture using a job queue or delayed task
      const captureDate = new Date(Date.now() + delay);
      
      // Store in Redis for processing
      await redis.setex(
        `auto_capture:${paymentId}`,
        Math.ceil(delay / 1000),
        JSON.stringify({ paymentId, scheduledAt: captureDate })
      );
      
      logger.info('Auto-capture scheduled', { paymentId, captureDate });
      
    } catch (error) {
      logger.error('Failed to schedule auto-capture', { paymentId, error: error.message });
    }
  }
  
  // Webhook handling
  async handleWebhook(provider, payload, signature) {
    try {
      return await this.webhookService.processWebhook(provider, payload, signature);
    } catch (error) {
      logger.error('Webhook processing failed', { provider, error: error.message });
      throw error;
    }
  }
  
  // Payment retrieval and management
  async getPayment(paymentId) {
    try {
      // First check Redis cache
      const cached = await redis.get(`payment:${paymentId}`);
      if (cached) {
        return new Payment(JSON.parse(cached));
      }
      
      // If not in cache, fetch from database
      // This would be replaced with actual database query
      const paymentData = await this.fetchPaymentFromDatabase(paymentId);
      if (paymentData) {
        const payment = new Payment(paymentData);
        // Cache for 1 hour
        await redis.setex(`payment:${paymentId}`, 3600, JSON.stringify(payment));
        return payment;
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to get payment', { paymentId, error: error.message });
      throw error;
    }
  }
  
  async savePayment(payment) {
    try {
      payment.updatedAt = new Date();
      
      // Save to database (mock implementation)
      await this.savePaymentToDatabase(payment);
      
      // Update cache
      await redis.setex(`payment:${payment.id}`, 3600, JSON.stringify(payment));
      
      logger.debug('Payment saved', { paymentId: payment.id });
      
    } catch (error) {
      logger.error('Failed to save payment', { paymentId: payment.id, error: error.message });
      throw error;
    }
  }
  
  async fetchPaymentFromDatabase(paymentId) {
    // Mock implementation - replace with actual database query
    logger.debug('Fetching payment from database', { paymentId });
    return null;
  }
  
  async savePaymentToDatabase(payment) {
    // Mock implementation - replace with actual database save
    logger.debug('Saving payment to database', { paymentId: payment.id });
  }
  
  async publishPaymentEvent(eventType, payment) {
    try {
      const event = {
        eventType,
        paymentId: payment.id,
        bookingId: payment.bookingId,
        customerId: payment.customerId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        timestamp: new Date(),
        data: payment.toPublicJson()
      };
      
      await publishEvent('payment-events', event);
      
      logger.debug('Payment event published', { eventType, paymentId: payment.id });
      
    } catch (error) {
      logger.error('Failed to publish payment event', { 
        eventType, 
        paymentId: payment.id, 
        error: error.message 
      });
    }
  }
  
  // Analytics and reporting
  async getPaymentAnalytics(filters = {}) {
    try {
      // This would fetch analytics from database/cache
      return {
        totalPayments: 0,
        totalAmount: 0,
        successRate: 0,
        averageAmount: 0,
        topMethods: [],
        fraudRate: 0,
        chargebackRate: 0
      };
    } catch (error) {
      logger.error('Failed to get payment analytics', { error: error.message });
      throw error;
    }
  }
  
  async getDailyReconciliation(date) {
    try {
      return await this.reconciliationService.generateDailyReport(date);
    } catch (error) {
      logger.error('Failed to get daily reconciliation', { date, error: error.message });
      throw error;
    }
  }
}

module.exports = PaymentService;