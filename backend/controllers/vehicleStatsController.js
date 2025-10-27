const VehicleStats = require('../models/VehicleStats');
const Vehicle = require('../models/vehicle');

/**
 * Vehicle Statistics Controller for handling vehicle visit and offer statistics
 */
class VehicleStatsController {
  /**
   * Record a visit for a vehicle
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async recordVisit(req, res) {
    try {
      const { vehicle_id, license_plate } = req.body;

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

      const stats = await VehicleStats.recordVisit(vehicleId);
      
      res.json({
        success: true,
        message: 'Visit recorded successfully',
        data: stats
      });
    } catch (error) {
      console.error('Error recording visit:', error);
      res.status(500).json({
        success: false,
        message: 'Error recording visit',
        error: error.message
      });
    }
  }

  /**
   * Get vehicle statistics by vehicle ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getStatsByVehicleId(req, res) {
    try {
      const { vehicle_id } = req.params;
      
      const stats = await VehicleStats.findByVehicleId(parseInt(vehicle_id));
      
      if (!stats) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle statistics not found'
        });
      }
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching vehicle statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching vehicle statistics',
        error: error.message
      });
    }
  }

  /**
   * Get vehicle statistics by license plate
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getStatsByLicensePlate(req, res) {
    try {
      const { license_plate } = req.params;
      
      const stats = await VehicleStats.findByLicensePlate(license_plate);
      
      if (!stats) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle statistics not found'
        });
      }
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching vehicle statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching vehicle statistics',
        error: error.message
      });
    }
  }

  /**
   * Get all vehicle statistics with optional filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllStats(req, res) {
    try {
      const {
        min_visits,
        min_current_visits,
        has_offers_earned,
        has_offers_used,
        license_plate,
        owner_name,
        sort_by = 'total_visits',
        sort_order = 'desc',
        page = 1,
        limit = 50
      } = req.query;

      const filters = {
        min_visits,
        min_current_visits,
        has_offers_earned,
        has_offers_used,
        license_plate,
        owner_name,
        sort_by,
        sort_order
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const stats = await VehicleStats.findAll(filters);
      
      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedStats = stats.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedStats,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(stats.length / limit),
          total_vehicles: stats.length,
          has_next: endIndex < stats.length,
          has_prev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching vehicle statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching vehicle statistics',
        error: error.message
      });
    }
  }

  /**
   * Reset visit count for a vehicle (after offer utilization)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async resetVisitCount(req, res) {
    try {
      const { vehicle_id } = req.params;
      
      const stats = await VehicleStats.resetVisitCount(parseInt(vehicle_id));
      
      res.json({
        success: true,
        message: 'Visit count reset successfully',
        data: stats
      });
    } catch (error) {
      console.error('Error resetting visit count:', error);
      res.status(500).json({
        success: false,
        message: 'Error resetting visit count',
        error: error.message
      });
    }
  }

  /**
   * Increment offers earned for a vehicle
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async incrementOffersEarned(req, res) {
    try {
      const { vehicle_id } = req.params;
      
      const stats = await VehicleStats.incrementOffersEarned(parseInt(vehicle_id));
      
      res.json({
        success: true,
        message: 'Offers earned count incremented successfully',
        data: stats
      });
    } catch (error) {
      console.error('Error incrementing offers earned:', error);
      res.status(500).json({
        success: false,
        message: 'Error incrementing offers earned',
        error: error.message
      });
    }
  }

  /**
   * Increment offers used for a vehicle
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async incrementOffersUsed(req, res) {
    try {
      const { vehicle_id } = req.params;
      
      const stats = await VehicleStats.incrementOffersUsed(parseInt(vehicle_id));
      
      res.json({
        success: true,
        message: 'Offers used count incremented successfully',
        data: stats
      });
    } catch (error) {
      console.error('Error incrementing offers used:', error);
      res.status(500).json({
        success: false,
        message: 'Error incrementing offers used',
        error: error.message
      });
    }
  }

  /**
   * Get top vehicles by visit count
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTopVehicles(req, res) {
    try {
      const { limit = 10 } = req.query;

      const vehicles = await VehicleStats.getTopVehiclesByVisits(parseInt(limit));
      
      res.json({
        success: true,
        data: vehicles
      });
    } catch (error) {
      console.error('Error fetching top vehicles:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching top vehicles',
        error: error.message
      });
    }
  }

  /**
   * Get vehicles eligible for offers
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getEligibleVehicles(req, res) {
    try {
      const { visit_threshold = 5, page = 1, limit = 50 } = req.query;

      const vehicles = await VehicleStats.getVehiclesEligibleForOffers(parseInt(visit_threshold));
      
      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedVehicles = vehicles.slice(startIndex, endIndex);

      res.json({
        success: false,
        data: paginatedVehicles,
        summary: {
          visit_threshold: parseInt(visit_threshold),
          total_eligible: vehicles.length
        },
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(vehicles.length / limit),
          total_vehicles: vehicles.length,
          has_next: endIndex < vehicles.length,
          has_prev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching eligible vehicles:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching eligible vehicles',
        error: error.message
      });
    }
  }

  /**
   * Get vehicles near offer threshold
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getVehiclesNearThreshold(req, res) {
    try {
      const { threshold = 5, buffer = 2, page = 1, limit = 50 } = req.query;

      const vehicles = await VehicleStats.getVehiclesNearOfferThreshold(
        parseInt(threshold), 
        parseInt(buffer)
      );
      
      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedVehicles = vehicles.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedVehicles,
        summary: {
          threshold: parseInt(threshold),
          buffer: parseInt(buffer),
          total_near_threshold: vehicles.length
        },
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(vehicles.length / limit),
          total_vehicles: vehicles.length,
          has_next: endIndex < vehicles.length,
          has_prev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching vehicles near threshold:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching vehicles near threshold',
        error: error.message
      });
    }
  }

  /**
   * Get vehicle statistics overview
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getOverview(req, res) {
    try {
      const overview = await VehicleStats.getOverview();
      
      res.json({
        success: true,
        data: overview
      });
    } catch (error) {
      console.error('Error fetching overview:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching overview',
        error: error.message
      });
    }
  }

  /**
   * Get visit trends
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getVisitTrends(req, res) {
    try {
      const { days = 30 } = req.query;

      const trends = await VehicleStats.getVisitTrends(parseInt(days));
      
      res.json({
        success: true,
        data: trends,
        summary: {
          period_days: parseInt(days),
          total_days: trends.length,
          total_visits: trends.reduce((sum, day) => sum + parseInt(day.daily_visits), 0),
          average_daily_visits: trends.length > 0 ? 
            trends.reduce((sum, day) => sum + parseInt(day.daily_visits), 0) / trends.length : 0
        }
      });
    } catch (error) {
      console.error('Error fetching visit trends:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching visit trends',
        error: error.message
      });
    }
  }

  /**
   * Get vehicles with most offers
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getVehiclesWithMostOffers(req, res) {
    try {
      const { limit = 10 } = req.query;

      const vehicles = await VehicleStats.getVehiclesWithMostOffers(parseInt(limit));
      
      res.json({
        success: true,
        data: vehicles
      });
    } catch (error) {
      console.error('Error fetching vehicles with most offers:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching vehicles with most offers',
        error: error.message
      });
    }
  }

  /**
   * Update vehicle statistics manually (admin function)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateStats(req, res) {
    try {
      const { vehicle_id } = req.params;
      const { total_visits, current_visit_count, total_offers_earned, total_offers_used } = req.body;

      const updateData = {};
      if (total_visits !== undefined) updateData.total_visits = parseInt(total_visits);
      if (current_visit_count !== undefined) updateData.current_visit_count = parseInt(current_visit_count);
      if (total_offers_earned !== undefined) updateData.total_offers_earned = parseInt(total_offers_earned);
      if (total_offers_used !== undefined) updateData.total_offers_used = parseInt(total_offers_used);

      // Check if there's anything to update
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }

      const stats = await VehicleStats.updateStats(parseInt(vehicle_id), updateData);
      
      res.json({
        success: true,
        message: 'Vehicle statistics updated successfully',
        data: stats
      });
    } catch (error) {
      console.error('Error updating vehicle statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating vehicle statistics',
        error: error.message
      });
    }
  }

  /**
   * Initialize statistics for a vehicle
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async initializeStats(req, res) {
    try {
      const { vehicle_id } = req.params;
      
      const stats = await VehicleStats.initializeStats(parseInt(vehicle_id));
      
      res.json({
        success: true,
        message: 'Vehicle statistics initialized successfully',
        data: stats
      });
    } catch (error) {
      console.error('Error initializing vehicle statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Error initializing vehicle statistics',
        error: error.message
      });
    }
  }
}

module.exports = new VehicleStatsController();