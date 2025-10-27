const express = require('express');
const router = express.Router();
const attendantServiceController = require('../controllers/attendantServiceController');
const authService = require('../services/authService');

/**
 * Attendant Service routes for managing attendant service records
 */

// Apply authentication middleware to all routes
router.use(authService.verifyTokenMiddleware());

// GET /api/attendant-services - Get all attendant services with optional filtering
router.get('/', attendantServiceController.getAllAttendantServices);

// GET /api/attendant-services/date/:date - Get attendant services for specific date (YYYY-MM-DD)
router.get('/date/:date', attendantServiceController.getAttendantServicesByDate);

// GET /api/attendant-services/attendant/:attendant_id - Get services by attendant ID
router.get('/attendant/:attendant_id', attendantServiceController.getServicesByAttendantId);

// GET /api/attendant-services/car/:car_id - Get services by car ID
router.get('/car/:car_id', attendantServiceController.getServicesByCarId);

// GET /api/attendant-services/performance/:attendant_id - Get attendant performance statistics
router.get('/performance/:attendant_id', attendantServiceController.getAttendantPerformance);

// GET /api/attendant-services/daily-report/:date - Get daily attendant service report
router.get('/daily-report/:date', attendantServiceController.getDailyAttendantReport);

// GET /api/attendant-services/:id - Get attendant service by ID (yyyddmmhhMMsss format)
router.get('/:id', attendantServiceController.getAttendantServiceById);

// POST /api/attendant-services - Create new attendant service record
router.post('/', attendantServiceController.createAttendantService);

// PUT /api/attendant-services/:id - Update attendant service record
router.put('/:id', attendantServiceController.updateAttendantService);

// DELETE /api/attendant-services/:id - Delete attendant service record
router.delete('/:id', attendantServiceController.deleteAttendantService);

module.exports = router;