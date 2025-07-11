// analytics.dto.js - DTOs and validation schemas for analytics endpoints

const Joi = require('joi');

exports.dashboardQuerySchema = Joi.object({
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
  // ... other fields
});