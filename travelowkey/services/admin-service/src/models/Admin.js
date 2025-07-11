// Admin.js - Data model/entity for Admin

const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: String,
  // ... other fields
});

module.exports = mongoose.model('Admin', adminSchema);