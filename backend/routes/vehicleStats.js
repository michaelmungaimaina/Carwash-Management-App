const express = require('express');
const router = express.Router();
const vehicleStatsController = require('../controllers/vehicleStatsController');
const authService = require('../services/authService');

/**
 * Vehicle Statistics routes for managing vehicle visit and offer statistics
 */

// Apply authentication middleware to all routes
router.use(authService.verifyTokenMiddleware());

// POST /api/vehicle-stats/record-visit - Record a vehicle visit
router.post('/record-visit', vehicleStatsController.recordVisit);

// GET /api/vehicle-stats - Get all vehicle statistics with filtering
router.get('/', vehicleStatsController.getAllStats);

// GET /api/vehicle-stats/overview - Get statistics overview
router.get('/overview', vehicleStatsController.getOverview);

// GET /api/vehicle-stats/top-vehicles - Get top vehicles by visits
router.get('/top-vehicles', vehicleStatsController.getTopVehicles);

// GET /api/vehicle-stats/eligible - Get vehicles eligible for offers
router.get('/eligible', vehicleStatsController.getEligibleVehicles);

// GET /api/vehicle-stats/near-threshold - Get vehicles near offer threshold
router.get('/near-threshold', vehicleStatsController.getVehiclesNearThreshold);

// GET /api/vehicle-stats/visit-trends - Get visit trends
router.get('/visit-trends', vehicleStatsController.getVisitTrends);

// GET /api/vehicle-stats/most-offers - Get vehicles with most offers
router.get('/most-offers', vehicleStatsController.getVehiclesWithMostOffers);

// GET /api/vehicle-stats/vehicle/:vehicle_id - Get stats by vehicle ID
router.get('/vehicle/:vehicle_id', vehicleStatsController.getStatsByVehicleId);

// GET /api/vehicle-stats/license-plate/:license_plate - Get stats by license plate
router.get('/license-plate/:license_plate', vehicleStatsController.getStatsByLicensePlate);

// PUT /api/vehicle-stats/vehicle/:vehicle_id/reset-visits - Reset visit count
router.put('/vehicle/:vehicle_id/reset-visits', vehicleStatsController.resetVisitCount);

// PUT /api/vehicle-stats/vehicle/:vehicle_id/increment-offers-earned - Increment offers earned
router.put('/vehicle/:vehicle_id/increment-offers-earned', vehicleStatsController.incrementOffersEarned);

// PUT /api/vehicle-stats/vehicle/:vehicle_id/increment-offers-used - Increment offers used
router.put('/vehicle/:vehicle_id/increment-offers-used', vehicleStatsController.incrementOffersUsed);

// PUT /api/vehicle-stats/vehicle/:vehicle_id - Update vehicle statistics (admin)
router.put('/vehicle/:vehicle_id', vehicleStatsController.updateStats);

// POST /api/vehicle-stats/vehicle/:vehicle_id/initialize - Initialize statistics for vehicle
router.post('/vehicle/:vehicle_id/initialize', vehicleStatsController.initializeStats);

module.exports = router;