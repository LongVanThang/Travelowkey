// notification.dto.js - DTOs and validation schemas for notification endpoints

const Joi = require('joi');

exports.sendNotificationSchema = Joi.object({
  recipient: Joi.string().required(),
  message: Joi.string().required(),
  // ... other fields
});