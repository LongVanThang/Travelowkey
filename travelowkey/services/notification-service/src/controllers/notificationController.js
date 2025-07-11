// notificationController.js - Route handler functions for notification endpoints

const notificationService = require('../services/notificationService');

exports.sendNotification = async (req, res, next) => {
  try {
    const result = await notificationService.sendNotification(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};
// ... add more handlers as needed