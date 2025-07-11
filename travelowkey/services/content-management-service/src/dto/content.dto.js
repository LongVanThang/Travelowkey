// content.dto.js - DTOs and validation schemas for content endpoints

const Joi = require('joi');

exports.createContentSchema = Joi.object({
  title: Joi.string().required(),
  body: Joi.string().required(),
  // ... other fields
});