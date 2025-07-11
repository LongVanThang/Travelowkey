const express = require('express');
const HotelController = require('../controllers/HotelController');

const router = express.Router();
const hotelController = new HotelController();

// Hotel search endpoint
router.post(
  '/',
  HotelController.validateSearchRequest(),
  hotelController.searchHotels.bind(hotelController)
);

// Search suggestions/autocomplete
router.get(
  '/suggestions',
  HotelController.validateSearchSuggestions(),
  hotelController.getSearchSuggestions.bind(hotelController)
);

module.exports = router;