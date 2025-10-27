const express = require('express');
const router = express.Router();
const carController = require('../controllers/carController');
const authService = require('../services/authService');

/**
 * Car registry routes for managing car wash services
 * ID Format: yyyddmmhhMMsss (e.g., 231215143045123)
 */

// Apply authentication middleware to all routes
router.use(authService.verifyTokenMiddleware());

// GET /api/cars - Get all car services with optional filtering
router.get('/', carController.getAllCarServices);

// GET /api/cars/stats - Get car service statistics
router.get('/stats', carController.getCarStatistics);

// GET /api/cars/date/:date - Get car services for specific date (YYYY-MM-DD)
router.get('/date/:date', carController.getCarServicesByDate);

// GET /api/cars/payment/cash - Get car services with cash payments
router.get('/payment/cash', carController.getCashPaymentServices);

// GET /api/cars/payment/:mode - Get car services by payment mode (CASH, MPESA, CARD, BOTH)
router.get('/payment/:mode', carController.getServicesByPaymentMode);

// GET /api/cars/daily-report/:date - Get daily car service report
router.get('/daily-report/:date', carController.getDailyCarReport);

// GET /api/cars/:id - Get car service by ID (yyyddmmhhMMsss format)
router.get('/:id', carController.getCarServiceById);

// GET /api/cars/:id/datetime - Get readable datetime from car service ID
router.get('/:id/datetime', carController.getCarServiceDateTime);

// POST /api/cars - Create new car service record
router.post('/', carController.createCarService);

// PUT /api/cars/:id - Update car service record
router.put('/:id', carController.updateCarService);

// DELETE /api/cars/:id - Delete car service record
router.delete('/:id', carController.deleteCarService);

module.exports = router;