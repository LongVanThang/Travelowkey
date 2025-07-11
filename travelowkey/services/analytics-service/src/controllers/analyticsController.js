// analyticsController.js - Route handler functions for analytics endpoints

const analyticsService = require('../services/analyticsService');

exports.getDashboard = async (req, res, next) => {
  try {
    const dashboardData = await analyticsService.getDashboardData(req.user);
    res.json(dashboardData);
  } catch (err) {
    next(err);
  }
};
// ... add more handlers as needed