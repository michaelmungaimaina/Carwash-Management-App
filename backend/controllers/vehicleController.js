const Vehicle = require('../models/vehicle');
const CarRegistry = require('../models/CarRegistry');

/**
 * Vehicle Controller for handling vehicle operations
 */
class VehicleController {
  /**
   * Register a vehicle from car registry
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async registerFromCarRegistry(req, res) {
    try {
      const { car_registry_id } = req.body;

      if (!car_registry_id) {
        return res.status(400).json({
          success: false,
          message: 'Car registry ID is required'
        });
      }

      // Get car registry data
      const carRegistry = await CarRegistry.findById(car_registry_id);
      if (!carRegistry) {
        return res.status(404).json({
          success: false,
          message: 'Car registry entry not found'
        });
      }

      // Register vehicle from car registry
      const vehicle = await Vehicle.registerFromCarRegistry(carRegistry);
      
      res.json({
        success: true,
        message: 'Vehicle registered successfully',
        data: vehicle
      });
    } catch (error) {
      console.error('Error registering vehicle from car registry:', error);
      res.status(500).json({
        success: false,
        message: 'Error registering vehicle',
        error: error.message
      });
    }
  }

  /**
   * Create or update vehicle
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createOrUpdateVehicle(req, res) {
    try {
      const { license_plate, make, model, owner_name, phone_number, email } = req.body;

      if (!license_plate) {
        return res.status(400).json({
          success: false,
          message: 'License plate is required'
        });
      }

      const vehicleData = {
        license_plate,
        make,
        model,
        owner_name,
        phone_number,
        email
      };

      const vehicle = await Vehicle.createOrUpdate(vehicleData);
      
      res.json({
        success: true,
        message: vehicle.id ? 'Vehicle updated successfully' : 'Vehicle created successfully',
        data: vehicle
      });
    } catch (error) {
      console.error('Error creating/updating vehicle:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing vehicle',
        error: error.message
      });
    }
  }

  /**
   * Update vehicle owner information
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateOwnerInfo(req, res) {
    try {
      const { license_plate } = req.params;
      const { owner_name, phone_number, email } = req.body;

      if (!license_plate) {
        return res.status(400).json({
          success: false,
          message: 'License plate is required'
        });
      }

      if (!owner_name && !phone_number && !email) {
        return res.status(400).json({
          success: false,
          message: 'At least one owner information field is required'
        });
      }

      const ownerData = {
        owner_name,
        phone_number,
        email
      };

      const vehicle = await Vehicle.updateOwnerInfo(license_plate, ownerData);
      
      res.json({
        success: true,
        message: 'Owner information updated successfully',
        data: vehicle
      });
    } catch (error) {
      console.error('Error updating owner information:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating owner information',
        error: error.message
      });
    }
  }

  /**
   * Get all vehicles with optional filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllVehicles(req, res) {
    try {
      const {
        license_plate,
        owner_name,
        phone_number,
        make,
        model,
        has_owner_info,
        page = 1,
        limit = 50
      } = req.query;

      const filters = {
        license_plate,
        owner_name,
        phone_number,
        make,
        model,
        has_owner_info
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const vehicles = await Vehicle.findAll(filters);
      
      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedVehicles = vehicles.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedVehicles,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(vehicles.length / limit),
          total_vehicles: vehicles.length,
          has_next: endIndex < vehicles.length,
          has_prev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching vehicles',
        error: error.message
      });
    }
  }

  /**
   * Get vehicle by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getVehicleById(req, res) {
    try {
      const { id } = req.params;
      
      const vehicle = await Vehicle.findById(id);
      
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
      }
      
      res.json({
        success: true,
        data: vehicle
      });
    } catch (error) {
      console.error('Error fetching vehicle:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching vehicle',
        error: error.message
      });
    }
  }

  /**
   * Get vehicle by license plate
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getVehicleByLicensePlate(req, res) {
    try {
      const { license_plate } = req.params;
      
      const vehicle = await Vehicle.findByLicensePlate(license_plate);
      
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
      }
      
      res.json({
        success: true,
        data: vehicle
      });
    } catch (error) {
      console.error('Error fetching vehicle:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching vehicle',
        error: error.message
      });
    }
  }

  /**
   * Search vehicles
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async searchVehicles(req, res) {
    try {
      const { q, page = 1, limit = 50 } = req.query;
      
      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const vehicles = await Vehicle.search(q);
      
      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedVehicles = vehicles.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedVehicles,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(vehicles.length / limit),
          total_vehicles: vehicles.length,
          has_next: endIndex < vehicles.length,
          has_prev: page > 1
        }
      });
    } catch (error) {
      console.error('Error searching vehicles:', error);
      res.status(500).json({
        success: false,
        message: 'Error searching vehicles',
        error: error.message
      });
    }
  }

  /**
   * Get vehicles with statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getVehiclesWithStats(req, res) {
    try {
      const { limit = 50, page = 1 } = req.query;

      const vehicles = await Vehicle.getVehiclesWithStats(parseInt(limit));
      
      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedVehicles = vehicles.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedVehicles,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(vehicles.length / limit),
          total_vehicles: vehicles.length,
          has_next: endIndex < vehicles.length,
          has_prev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching vehicles with statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching vehicles with statistics',
        error: error.message
      });
    }
  }

  /**
   * Get vehicles without owner information
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getVehiclesWithoutOwnerInfo(req, res) {
    try {
      const { limit = 50, page = 1 } = req.query;

      const vehicles = await Vehicle.getVehiclesWithoutOwnerInfo(parseInt(limit));
      
      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedVehicles = vehicles.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedVehicles,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(vehicles.length / limit),
          total_vehicles: vehicles.length,
          has_next: endIndex < vehicles.length,
          has_prev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching vehicles without owner info:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching vehicles without owner information',
        error: error.message
      });
    }
  }

  /**
   * Get frequent vehicles
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getFrequentVehicles(req, res) {
    try {
      const { min_visits = 5, limit = 50, page = 1 } = req.query;

      const vehicles = await Vehicle.getFrequentVehicles(parseInt(min_visits), parseInt(limit));
      
      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedVehicles = vehicles.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedVehicles,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(vehicles.length / limit),
          total_vehicles: vehicles.length,
          has_next: endIndex < vehicles.length,
          has_prev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching frequent vehicles:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching frequent vehicles',
        error: error.message
      });
    }
  }

  /**
   * Get vehicle statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getVehicleStatistics(req, res) {
    try {
      const statistics = await Vehicle.getStatistics();
      
      res.json({
        success: true,
        data: statistics
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
   * Update vehicle
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateVehicle(req, res) {
    try {
      const { id } = req.params;
      const { license_plate, make, model, owner_name, phone_number, email } = req.body;
      
      const vehicle = await Vehicle.findById(id);
      
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
      }

      const updateData = {};
      if (license_plate !== undefined) updateData.license_plate = license_plate;
      if (make !== undefined) updateData.make = make;
      if (model !== undefined) updateData.model = model;
      if (owner_name !== undefined) updateData.owner_name = owner_name;
      if (phone_number !== undefined) updateData.phone_number = phone_number;
      if (email !== undefined) updateData.email = email;

      // Check if there's anything to update
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }

      const updatedVehicle = await Vehicle.update(id, updateData);
      
      res.json({
        success: true,
        message: 'Vehicle updated successfully',
        data: updatedVehicle
      });
    } catch (error) {
      console.error('Error updating vehicle:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating vehicle',
        error: error.message
      });
    }
  }

  /**
   * Delete vehicle
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteVehicle(req, res) {
    try {
      const { id } = req.params;
      
      const vehicle = await Vehicle.findById(id);
      
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
      }

      const deleted = await Vehicle.delete(id);
      
      res.json({
        success: true,
        message: 'Vehicle deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting vehicle',
        error: error.message
      });
    }
  }
}

module.exports = new VehicleController();