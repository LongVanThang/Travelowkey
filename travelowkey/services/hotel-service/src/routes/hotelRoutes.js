const express = require('express');
const HotelController = require('../controllers/HotelController');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

const router = express.Router();
const hotelController = new HotelController();

// Public routes (read-only)
router.get(
  '/',
  HotelController.validatePagination(),
  hotelController.getAllHotels.bind(hotelController)
);

router.get(
  '/filters',
  hotelController.getAvailableFilters.bind(hotelController)
);

router.get(
  '/:id',
  HotelController.validateHotelId(),
  hotelController.getHotelById.bind(hotelController)
);

// Protected routes (require authentication)
router.use(authMiddleware);

// Admin-only routes
router.post(
  '/',
  adminMiddleware,
  HotelController.validateCreateHotel(),
  hotelController.createHotel.bind(hotelController)
);

router.put(
  '/:id',
  adminMiddleware,
  HotelController.validateUpdateHotel(),
  hotelController.updateHotel.bind(hotelController)
);

router.delete(
  '/:id',
  adminMiddleware,
  HotelController.validateHotelId(),
  hotelController.deleteHotel.bind(hotelController)
);

router.post(
  '/:id/sync',
  adminMiddleware,
  HotelController.validateHotelId(),
  hotelController.syncHotelWithExternalAPIs.bind(hotelController)
);

module.exports = router;