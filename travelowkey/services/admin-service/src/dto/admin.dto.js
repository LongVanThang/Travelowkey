// admin.dto.js - DTOs and validation schemas for admin endpoints

const Joi = require('joi');

exports.createUserSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('admin', 'super_admin', 'moderator').required(),
  // ... other fields
});