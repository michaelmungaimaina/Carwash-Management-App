const VehicleOffer = require('../models/VehicleOffer');
const Vehicle = require('../models/vehicle');
const VehicleStats = require('../models/VehicleStats');

/**
 * Vehicle Offer Controller for managing vehicle-specific offers
 */
class VehicleOfferController {
  /**
   * Create a new vehicle offer
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createVehicleOffer(req, res) {
    try {
      const {
        vehicle_id,
        offer_id,
        earned_on_visit_id,
        issued_date,
        used_date,
        used_on_visit_id,
        status = 'active',
        notes
      } = req.body;

      // Validate required fields
      if (!vehicle_id || !offer_id) {
        return res.status(400).json({
          success: false,
          message: 'Vehicle ID and Offer ID are required'
        });
      }

      // Check if vehicle already has an active offer of the same type
      const hasActiveOffer = await VehicleOffer.hasActiveOffer(vehicle_id, offer_id);
      if (hasActiveOffer && status === 'active') {
        return res.status(400).json({
          success: false,
          message: 'Vehicle already has an active offer of this type'
        });
      }

      const offerData = {
        vehicle_id,
        offer_id,
        earned_on_visit_id,
        issued_date,
        used_date,
        used_on_visit_id,
        status,
        notes
      };

      const vehicleOffer = await VehicleOffer.create(offerData);

      // If this is a newly earned offer, increment offers earned count
      if (status === 'active' && earned_on_visit_id) {
        try {
          await VehicleStats.incrementOffersEarned(vehicle_id);
        } catch (statsError) {
          console.error('Error updating offers earned count:', statsError);
          // Continue even if stats update fails
        }
      }
      
      res.status(201).json({
        success: true,
        message: 'Vehicle offer created successfully',
        data: vehicleOffer
      });
    } catch (error) {
      console.error('Error creating vehicle offer:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating vehicle offer',
        error: error.message
      });
    }
  }

  /**
   * Get all vehicle offers with optional filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllVehicleOffers(req, res) {
    try {
      const {
        vehicle_id,
        offer_id,
        status,
        license_plate,
        owner_name,
        start_date,
        end_date,
        is_active,
        is_used,
        is_expired,
        sort_by = 'issued_date',
        sort_order = 'desc',
        page = 1,
        limit = 50
      } = req.query;

      const filters = {
        vehicle_id,
        offer_id,
        status,
        license_plate,
        owner_name,
        start_date,
        end_date,
        is_active,
        is_used,
        is_expired,
        sort_by,
        sort_order
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const vehicleOffers = await VehicleOffer.findAll(filters);
      
      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedOffers = vehicleOffers.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedOffers,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(vehicleOffers.length / limit),
          total_offers: vehicleOffers.length,
          has_next: endIndex < vehicleOffers.length,
          has_prev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching vehicle offers:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching vehicle offers',
        error: error.message
      });
    }
  }

  /**
   * Get vehicle offer by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getVehicleOfferById(req, res) {
    try {
      const { id } = req.params;
      
      const vehicleOffer = await VehicleOffer.findById(parseInt(id));
      
      if (!vehicleOffer) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle offer not found'
        });
      }
      
      res.json({
        success: true,
        data: vehicleOffer
      });
    } catch (error) {
      console.error('Error fetching vehicle offer:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching vehicle offer',
        error: error.message
      });
    }
  }

  /**
   * Get active offers for a vehicle
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getActiveOffersByVehicleId(req, res) {
    try {
      const { vehicle_id } = req.params;
      
      const activeOffers = await VehicleOffer.findActiveByVehicleId(parseInt(vehicle_id));
      
      res.json({
        success: true,
        data: activeOffers,
        count: activeOffers.length
      });
    } catch (error) {
      console.error('Error fetching active vehicle offers:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching active vehicle offers',
        error: error.message
      });
    }
  }

  /**
   * Get offers by license plate
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getOffersByLicensePlate(req, res) {
    try {
      const { license_plate } = req.params;
      const { status, page = 1, limit = 50 } = req.query;
      
      const offers = await VehicleOffer.findByLicensePlate(license_plate, status);
      
      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedOffers = offers.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedOffers,
        summary: {
          license_plate: license_plate,
          status: status || 'all',
          total_offers: offers.length,
          active_offers: offers.filter(offer => offer.status === 'active').length,
          used_offers: offers.filter(offer => offer.status === 'used').length
        },
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(offers.length / limit),
          total_offers: offers.length,
          has_next: endIndex < offers.length,
          has_prev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching offers by license plate:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching offers by license plate',
        error: error.message
      });
    }
  }

  /**
   * Mark vehicle offer as used
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async markOfferAsUsed(req, res) {
    try {
      const { id } = req.params;
      const { used_on_visit_id, notes } = req.body;

      if (!used_on_visit_id) {
        return res.status(400).json({
          success: false,
          message: 'Used on visit ID is required'
        });
      }

      const vehicleOffer = await VehicleOffer.markAsUsed(parseInt(id), used_on_visit_id, notes);

      // Update offers used count in vehicle stats
      try {
        await VehicleStats.incrementOffersUsed(vehicleOffer.vehicle_id);
        
        // Reset visit count after offer utilization
        await VehicleStats.resetVisitCount(vehicleOffer.vehicle_id);
      } catch (statsError) {
        console.error('Error updating vehicle stats after offer usage:', statsError);
        // Continue even if stats update fails
      }
      
      res.json({
        success: true,
        message: 'Vehicle offer marked as used successfully',
        data: vehicleOffer
      });
    } catch (error) {
      console.error('Error marking offer as used:', error);
      res.status(500).json({
        success: false,
        message: 'Error marking offer as used',
        error: error.message
      });
    }
  }

  /**
   * Mark vehicle offer as expired
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async markOfferAsExpired(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const vehicleOffer = await VehicleOffer.markAsExpired(parseInt(id), notes);
      
      res.json({
        success: true,
        message: 'Vehicle offer marked as expired successfully',
        data: vehicleOffer
      });
    } catch (error) {
      console.error('Error marking offer as expired:', error);
      res.status(500).json({
        success: false,
        message: 'Error marking offer as expired',
        error: error.message
      });
    }
  }

  /**
   * Update vehicle offer
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateVehicleOffer(req, res) {
    try {
      const { id } = req.params;
      const {
        vehicle_id,
        offer_id,
        earned_on_visit_id,
        issued_date,
        used_date,
        used_on_visit_id,
        status,
        notes
      } = req.body;
      
      const existingOffer = await VehicleOffer.findById(parseInt(id));
      
      if (!existingOffer) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle offer not found'
        });
      }

      // Check for duplicate active offers if updating vehicle_id or offer_id
      if ((vehicle_id || offer_id) && status === 'active') {
        const checkVehicleId = vehicle_id || existingOffer.vehicle_id;
        const checkOfferId = offer_id || existingOffer.offer_id;
        
        const hasActiveOffer = await VehicleOffer.hasActiveOffer(checkVehicleId, checkOfferId);
        if (hasActiveOffer && existingOffer.id !== parseInt(id)) {
          return res.status(400).json({
            success: false,
            message: 'Vehicle already has an active offer of this type'
          });
        }
      }

      const updateData = {};
      if (vehicle_id !== undefined) updateData.vehicle_id = vehicle_id;
      if (offer_id !== undefined) updateData.offer_id = offer_id;
      if (earned_on_visit_id !== undefined) updateData.earned_on_visit_id = earned_on_visit_id;
      if (issued_date !== undefined) updateData.issued_date = issued_date;
      if (used_date !== undefined) updateData.used_date = used_date;
      if (used_on_visit_id !== undefined) updateData.used_on_visit_id = used_on_visit_id;
      if (status !== undefined) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;

      // Check if there's anything to update
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }

      const updatedOffer = await VehicleOffer.update(parseInt(id), updateData);
      
      res.json({
        success: true,
        message: 'Vehicle offer updated successfully',
        data: updatedOffer
      });
    } catch (error) {
      console.error('Error updating vehicle offer:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating vehicle offer',
        error: error.message
      });
    }
  }

  /**
   * Delete vehicle offer
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteVehicleOffer(req, res) {
    try {
      const { id } = req.params;
      
      const existingOffer = await VehicleOffer.findById(parseInt(id));
      
      if (!existingOffer) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle offer not found'
        });
      }

      const deleted = await VehicleOffer.delete(parseInt(id));
      
      res.json({
        success: true,
        message: 'Vehicle offer deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting vehicle offer:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting vehicle offer',
        error: error.message
      });
    }
  }

  /**
   * Get vehicle offer statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getVehicleOfferStatistics(req, res) {
    try {
      const { start_date, end_date } = req.query;

      const filters = {};
      if (start_date) filters.start_date = start_date;
      if (end_date) filters.end_date = end_date;

      const statistics = await VehicleOffer.getStatistics(filters);
      
      res.json({
        success: true,
        data: statistics,
        filters: filters
      });
    } catch (error) {
      console.error('Error fetching vehicle offer statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching vehicle offer statistics',
        error: error.message
      });
    }
  }

  /**
   * Get offers expiring soon
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getOffersExpiringSoon(req, res) {
    try {
      const { days = 7, page = 1, limit = 50 } = req.query;

      const offers = await VehicleOffer.getOffersExpiringSoon(parseInt(days));
      
      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedOffers = offers.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedOffers,
        summary: {
          days: parseInt(days),
          total_expiring: offers.length
        },
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(offers.length / limit),
          total_offers: offers.length,
          has_next: endIndex < offers.length,
          has_prev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching expiring offers:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching expiring offers',
        error: error.message
      });
    }
  }

  /**
   * Bulk expire offers (admin function)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async bulkExpireOffers(req, res) {
    try {
      const expiredCount = await VehicleOffer.expireOffers();
      
      res.json({
        success: true,
        message: `Successfully expired ${expiredCount} offers`,
        data: {
          expired_count: expiredCount
        }
      });
    } catch (error) {
      console.error('Error bulk expiring offers:', error);
      res.status(500).json({
        success: false,
        message: 'Error bulk expiring offers',
        error: error.message
      });
    }
  }

  /**
   * Check if vehicle has active offers
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async checkVehicleActiveOffers(req, res) {
    try {
      const { vehicle_id, license_plate } = req.query;

      let vehicleId = vehicle_id;

      // If license plate is provided instead of vehicle_id, find the vehicle
      if (!vehicleId && license_plate) {
        const vehicle = await Vehicle.findByLicensePlate(license_plate);
        if (!vehicle) {
          return res.status(404).json({
            success: false,
            message: 'Vehicle not found with the provided license plate'
          });
        }
        vehicleId = vehicle.id;
      }

      if (!vehicleId) {
        return res.status(400).json({
          success: false,
          message: 'Either vehicle_id or license_plate is required'
        });
      }

      const activeOffers = await VehicleOffer.findActiveByVehicleId(parseInt(vehicleId));
      
      res.json({
        success: true,
        data: {
          vehicle_id: parseInt(vehicleId),
          has_active_offers: activeOffers.length > 0,
          active_offers_count: activeOffers.length,
          active_offers: activeOffers
        }
      });
    } catch (error) {
      console.error('Error checking vehicle active offers:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking vehicle active offers',
        error: error.message
      });
    }
  }
}

module.exports = new VehicleOfferController();