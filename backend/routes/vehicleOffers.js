const express = require('express');
const router = express.Router();
const vehicleOfferController = require('../controllers/vehicleOfferController');
const authService = require('../services/authService');

/**
 * Vehicle Offers routes for managing vehicle-specific offers
 */

// Apply authentication middleware to all routes
router.use(authService.verifyTokenMiddleware());

// POST /api/vehicle-offers - Create new vehicle offer
router.post('/', vehicleOfferController.createVehicleOffer);

// GET /api/vehicle-offers - Get all vehicle offers with filtering
router.get('/', vehicleOfferController.getAllVehicleOffers);

// GET /api/vehicle-offers/statistics - Get vehicle offer statistics
router.get('/statistics', vehicleOfferController.getVehicleOfferStatistics);

// GET /api/vehicle-offers/expiring-soon - Get offers expiring soon
router.get('/expiring-soon', vehicleOfferController.getOffersExpiringSoon);

// GET /api/vehicle-offers/check-active - Check if vehicle has active offers
router.get('/check-active', vehicleOfferController.checkVehicleActiveOffers);

// GET /api/vehicle-offers/vehicle/:vehicle_id/active - Get active offers for vehicle
router.get('/vehicle/:vehicle_id/active', vehicleOfferController.getActiveOffersByVehicleId);

// GET /api/vehicle-offers/license-plate/:license_plate - Get offers by license plate
router.get('/license-plate/:license_plate', vehicleOfferController.getOffersByLicensePlate);

// GET /api/vehicle-offers/:id - Get vehicle offer by ID
router.get('/:id', vehicleOfferController.getVehicleOfferById);

// PUT /api/vehicle-offers/:id/mark-used - Mark vehicle offer as used
router.put('/:id/mark-used', vehicleOfferController.markOfferAsUsed);

// PUT /api/vehicle-offers/:id/mark-expired - Mark vehicle offer as expired
router.put('/:id/mark-expired', vehicleOfferController.markOfferAsExpired);

// PUT /api/vehicle-offers/:id - Update vehicle offer
router.put('/:id', vehicleOfferController.updateVehicleOffer);

// DELETE /api/vehicle-offers/:id - Delete vehicle offer
router.delete('/:id', vehicleOfferController.deleteVehicleOffer);

// POST /api/vehicle-offers/bulk-expire - Bulk expire offers (admin function)
router.post('/bulk-expire', vehicleOfferController.bulkExpireOffers);

module.exports = router;