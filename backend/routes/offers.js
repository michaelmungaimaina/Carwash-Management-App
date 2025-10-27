const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');
const authService = require('../services/authService');

/**
 * Offers routes for managing promotional offers
 */

// Apply authentication middleware to all routes
router.use(authService.verifyTokenMiddleware());

// POST /api/offers - Create new offer
router.post('/', offerController.createOffer);

// GET /api/offers - Get all offers with filtering
router.get('/', offerController.getAllOffers);

// GET /api/offers/statistics - Get offer statistics
router.get('/statistics', offerController.getOfferStatistics);

// GET /api/offers/active - Get active offers
router.get('/active', offerController.getActiveOffers);

// GET /api/offers/currently-valid - Get currently valid offers
router.get('/currently-valid', offerController.getCurrentlyValidOffers);

// GET /api/offers/expiring-soon - Get offers expiring soon
router.get('/expiring-soon', offerController.getOffersExpiringSoon);

// GET /api/offers/starting-soon - Get offers starting soon
router.get('/starting-soon', offerController.getOffersStartingSoon);

// GET /api/offers/search - Search offers
router.get('/search', offerController.searchOffers);

// GET /api/offers/threshold-range - Get offers by threshold range
router.get('/threshold-range', offerController.getOffersByThresholdRange);

// GET /api/offers/:id - Get offer by ID
router.get('/:id', offerController.getOfferById);

// PUT /api/offers/:id - Update offer
router.put('/:id', offerController.updateOffer);

// PUT /api/offers/:id/toggle-status - Toggle offer status
router.put('/:id/toggle-status', offerController.toggleOfferStatus);

// DELETE /api/offers/:id - Delete offer
router.delete('/:id', offerController.deleteOffer);

// PUT /api/offers/bulk-update-status - Bulk update offer status
router.put('/bulk-update-status', offerController.bulkUpdateOfferStatus);

module.exports = router;