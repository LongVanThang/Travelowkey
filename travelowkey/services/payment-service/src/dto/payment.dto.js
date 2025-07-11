// payment.dto.js - DTOs and validation schemas for payment endpoints

const Joi = require('joi');

exports.createPaymentSchema = Joi.object({
  amount: Joi.number().positive().required(),
  method: Joi.string().required(),
  userId: Joi.string().required(),
  // ... other fields
});