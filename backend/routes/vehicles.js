const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const authService = require('../services/authService');

/**
 * Vehicle routes for managing vehicle information
 */

// Apply authentication middleware to all routes
router.use(authService.verifyTokenMiddleware());

// POST /api/vehicles/register-from-car-registry - Register vehicle from car registry
router.post('/register-from-car-registry', vehicleController.registerFromCarRegistry);

// POST /api/vehicles/create-or-update - Create or update vehicle
router.post('/create-or-update', vehicleController.createOrUpdateVehicle);

// PUT /api/vehicles/:license_plate/owner-info - Update vehicle owner information
router.put('/:license_plate/owner-info', vehicleController.updateOwnerInfo);

// GET /api/vehicles - Get all vehicles with optional filtering
router.get('/', vehicleController.getAllVehicles);

// GET /api/vehicles/search - Search vehicles
router.get('/search', vehicleController.searchVehicles);

// GET /api/vehicles/with-stats - Get vehicles with statistics
router.get('/with-stats', vehicleController.getVehiclesWithStats);

// GET /api/vehicles/without-owner-info - Get vehicles without owner information
router.get('/without-owner-info', vehicleController.getVehiclesWithoutOwnerInfo);

// GET /api/vehicles/frequent - Get frequent vehicles
router.get('/frequent', vehicleController.getFrequentVehicles);

// GET /api/vehicles/statistics - Get vehicle statistics
router.get('/statistics', vehicleController.getVehicleStatistics);

// GET /api/vehicles/:id - Get vehicle by ID
router.get('/:id', vehicleController.getVehicleById);

// GET /api/vehicles/license-plate/:license_plate - Get vehicle by license plate
router.get('/license-plate/:license_plate', vehicleController.getVehicleByLicensePlate);

// PUT /api/vehicles/:id - Update vehicle
router.put('/:id', vehicleController.updateVehicle);

// DELETE /api/vehicles/:id - Delete vehicle
router.delete('/:id', vehicleController.deleteVehicle);

module.exports = router;