// adminController.js - Route handler functions for admin endpoints

const adminService = require('../services/adminService');

exports.getDashboard = async (req, res, next) => {
  try {
    const dashboardData = await adminService.getDashboardData(req.user);
    res.json(dashboardData);
  } catch (err) {
    next(err);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const user = await adminService.createUser(req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
};
// ... add more handlers as needed