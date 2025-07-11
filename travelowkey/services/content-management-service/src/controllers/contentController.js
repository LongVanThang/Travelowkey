// contentController.js - Route handler functions for content endpoints

const contentService = require('../services/contentService');

exports.createContent = async (req, res, next) => {
  try {
    const content = await contentService.createContent(req.body);
    res.status(201).json(content);
  } catch (err) {
    next(err);
  }
};
// ... add more handlers as needed