const Offer = require('../models/Offer');

/**
 * Offer Controller for managing promotional offers
 */
class OfferController {
  /**
   * Create a new offer
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createOffer(req, res) {
    try {
      const {
        name,
        description,
        visit_threshold,
        discount_type,
        discount_value,
        is_active = true,
        valid_from,
        valid_until
      } = req.body;

      // Validate required fields
      if (!name || !visit_threshold || !discount_type) {
        return res.status(400).json({
          success: false,
          message: 'Name, visit threshold, and discount type are required'
        });
      }

      // Check if offer name already exists
      const existingOffer = await Offer.findByName(name);
      if (existingOffer) {
        return res.status(400).json({
          success: false,
          message: 'Offer name already exists'
        });
      }

      // Validate visit threshold
      if (visit_threshold <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Visit threshold must be a positive number'
        });
      }

      const offerData = {
        name,
        description,
        visit_threshold: parseInt(visit_threshold),
        discount_type,
        discount_value: discount_type === 'free_wash' ? 0 : parseFloat(discount_value),
        is_active,
        valid_from,
        valid_until
      };

      const offer = await Offer.create(offerData);
      
      res.status(201).json({
        success: true,
        message: 'Offer created successfully',
        data: offer
      });
    } catch (error) {
      console.error('Error creating offer:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating offer',
        error: error.message
      });
    }
  }

  /**
   * Get all offers with optional filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllOffers(req, res) {
    try {
      const {
        is_active,
        discount_type,
        min_visit_threshold,
        max_visit_threshold,
        current_date,
        name,
        sort_by = 'visit_threshold',
        sort_order = 'asc',
        page = 1,
        limit = 50
      } = req.query;

      const filters = {
        is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
        discount_type,
        min_visit_threshold,
        max_visit_threshold,
        current_date,
        name,
        sort_by,
        sort_order
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const offers = await Offer.findAll(filters);
      
      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedOffers = offers.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedOffers,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(offers.length / limit),
          total_offers: offers.length,
          has_next: endIndex < offers.length,
          has_prev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching offers:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching offers',
        error: error.message
      });
    }
  }

  /**
   * Get offer by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getOfferById(req, res) {
    try {
      const { id } = req.params;
      
      const offer = await Offer.findById(parseInt(id));
      
      if (!offer) {
        return res.status(404).json({
          success: false,
          message: 'Offer not found'
        });
      }
      
      res.json({
        success: true,
        data: offer
      });
    } catch (error) {
      console.error('Error fetching offer:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching offer',
        error: error.message
      });
    }
  }

  /**
   * Get active offers
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getActiveOffers(req, res) {
    try {
      const { date, page = 1, limit = 50 } = req.query;

      const offers = await Offer.getActiveOffers(date);
      
      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedOffers = offers.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedOffers,
        summary: {
          date: date || 'current date',
          total_active: offers.length
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
      console.error('Error fetching active offers:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching active offers',
        error: error.message
      });
    }
  }

  /**
   * Get currently valid offers
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCurrentlyValidOffers(req, res) {
    try {
      const { page = 1, limit = 50 } = req.query;

      const offers = await Offer.getCurrentlyValidOffers();
      
      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedOffers = offers.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedOffers,
        summary: {
          total_valid: offers.length
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
      console.error('Error fetching currently valid offers:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching currently valid offers',
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

      const offers = await Offer.getOffersExpiringSoon(parseInt(days));
      
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
   * Get offers starting soon
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getOffersStartingSoon(req, res) {
    try {
      const { days = 7, page = 1, limit = 50 } = req.query;

      const offers = await Offer.getOffersStartingSoon(parseInt(days));
      
      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedOffers = offers.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedOffers,
        summary: {
          days: parseInt(days),
          total_starting: offers.length
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
      console.error('Error fetching starting offers:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching starting offers',
        error: error.message
      });
    }
  }

  /**
   * Update offer
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateOffer(req, res) {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        visit_threshold,
        discount_type,
        discount_value,
        is_active,
        valid_from,
        valid_until
      } = req.body;
      
      const existingOffer = await Offer.findById(parseInt(id));
      
      if (!existingOffer) {
        return res.status(404).json({
          success: false,
          message: 'Offer not found'
        });
      }

      // Check if new name already exists (excluding current offer)
      if (name && name !== existingOffer.name) {
        const nameExists = await Offer.nameExists(name, parseInt(id));
        if (nameExists) {
          return res.status(400).json({
            success: false,
            message: 'Offer name already exists'
          });
        }
      }

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (visit_threshold !== undefined) updateData.visit_threshold = parseInt(visit_threshold);
      if (discount_type !== undefined) updateData.discount_type = discount_type;
      if (discount_value !== undefined) updateData.discount_value = parseFloat(discount_value);
      if (is_active !== undefined) updateData.is_active = is_active;
      if (valid_from !== undefined) updateData.valid_from = valid_from;
      if (valid_until !== undefined) updateData.valid_until = valid_until;

      // Check if there's anything to update
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }

      const updatedOffer = await Offer.update(parseInt(id), updateData);
      
      res.json({
        success: true,
        message: 'Offer updated successfully',
        data: updatedOffer
      });
    } catch (error) {
      console.error('Error updating offer:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating offer',
        error: error.message
      });
    }
  }

  /**
   * Delete offer
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteOffer(req, res) {
    try {
      const { id } = req.params;
      
      const existingOffer = await Offer.findById(parseInt(id));
      
      if (!existingOffer) {
        return res.status(404).json({
          success: false,
          message: 'Offer not found'
        });
      }

      const deleted = await Offer.delete(parseInt(id));
      
      res.json({
        success: true,
        message: 'Offer deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting offer:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting offer',
        error: error.message
      });
    }
  }

  /**
   * Get offer statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getOfferStatistics(req, res) {
    try {
      const statistics = await Offer.getStatistics();
      
      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error('Error fetching offer statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching offer statistics',
        error: error.message
      });
    }
  }

  /**
   * Search offers
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async searchOffers(req, res) {
    try {
      const { q, page = 1, limit = 50 } = req.query;
      
      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const offers = await Offer.search(q);
      
      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedOffers = offers.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedOffers,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(offers.length / limit),
          total_offers: offers.length,
          has_next: endIndex < offers.length,
          has_prev: page > 1
        }
      });
    } catch (error) {
      console.error('Error searching offers:', error);
      res.status(500).json({
        success: false,
        message: 'Error searching offers',
        error: error.message
      });
    }
  }

  /**
   * Get offers by threshold range
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getOffersByThresholdRange(req, res) {
    try {
      const { min_threshold = 1, max_threshold = 20, page = 1, limit = 50 } = req.query;

      const offers = await Offer.getOffersByThresholdRange(
        parseInt(min_threshold), 
        parseInt(max_threshold)
      );
      
      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedOffers = offers.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedOffers,
        summary: {
          min_threshold: parseInt(min_threshold),
          max_threshold: parseInt(max_threshold),
          total_in_range: offers.length
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
      console.error('Error fetching offers by threshold range:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching offers by threshold range',
        error: error.message
      });
    }
  }

  /**
   * Bulk update offer status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async bulkUpdateOfferStatus(req, res) {
    try {
      const { offer_ids, is_active } = req.body;

      if (!Array.isArray(offer_ids) || offer_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Offer IDs array is required'
        });
      }

      if (typeof is_active !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'is_active must be a boolean value'
        });
      }

      const updatedCount = await Offer.bulkUpdateStatus(offer_ids, is_active);
      
      res.json({
        success: true,
        message: `Successfully updated ${updatedCount} offers`,
        data: {
          updated_count: updatedCount,
          is_active: is_active
        }
      });
    } catch (error) {
      console.error('Error bulk updating offer status:', error);
      res.status(500).json({
        success: false,
        message: 'Error bulk updating offer status',
        error: error.message
      });
    }
  }

  /**
   * Toggle offer status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async toggleOfferStatus(req, res) {
    try {
      const { id } = req.params;
      
      const existingOffer = await Offer.findById(parseInt(id));
      
      if (!existingOffer) {
        return res.status(404).json({
          success: false,
          message: 'Offer not found'
        });
      }

      const newStatus = !existingOffer.is_active;
      const updatedOffer = await Offer.update(parseInt(id), { is_active: newStatus });
      
      res.json({
        success: true,
        message: `Offer ${newStatus ? 'activated' : 'deactivated'} successfully`,
        data: updatedOffer
      });
    } catch (error) {
      console.error('Error toggling offer status:', error);
      res.status(500).json({
        success: false,
        message: 'Error toggling offer status',
        error: error.message
      });
    }
  }
}

module.exports = new OfferController();