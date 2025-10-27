const CarRegistry = require('../models/CarRegistry');
const Payment = require('../models/Payment');

/**
 * Car Controller for handling car registry operations
 */
class CarController {
  /**
   * Create a new car service record
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createCarService(req, res) {
    try {
      const {
        regno,
        model,
        service,
        amount,
        registered_by,
        tip_amount = 0,
        excess_amount = 0,
        branch_id,
        payment_mode = 'CASH',
        payment_ref = null
      } = req.body;

      // Validate required fields
      if (!regno || !model || !service || !amount || !registered_by || !branch_id) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: regno, model, service, amount, registered_by, branch_id'
        });
      }

      // Get current date in yyyymmdd format (from the ID format)
      const now = new Date();
      const currentDatePrefix = now
        .toISOString()
        .replace(/[-:TZ.]/g, '') // remove special chars
        .slice(0, 8); // yyyyMMdd

      // Check if the car regno already exists for today
      const existingCar = await CarRegistry.findByRegnoAndDate(regno, currentDatePrefix);
      if (existingCar) {
        return res.status(409).json({
          success: false,
          message: `Vehicle ${regno} has already been registered today. Shift to update instead.`,
          data: existingCar,
        });
      }

      // Create car service data
      const carData = {
        regno,
        model,
        service,
        amount: parseFloat(amount),
        registered_by,
        tip_amount: parseFloat(tip_amount),
        excess_amount: parseFloat(excess_amount),
        branch_id
      };

      // Create car service record
      const carService = await CarRegistry.create(carData);

      // Automatically register vehicle in vehicles table
      try {
        const vehicleData = {
          license_plate: regno,
          model: model || null
          // owner_name, phone_number, email will be updated later if provided
        };

        await Vehicle.createOrUpdate(vehicleData);

        /*/ If owner information is provided during payment, update vehicle
        if (owner_name || phone_number || email) {
          const ownerData = {
            owner_name: owner_name || null,
            phone_number: phone_number || null,
            email: email || null
          };

          await Vehicle.updateOwnerInfo(regno, ownerData);
        }*/

          // Automatically record visit in vehicle_stats
      if (vehicle && vehicle.id) {
        await VehicleStats.recordVisit(vehicle.id);
      }
      } catch (vehicleError) {
        console.error('Error auto-registering vehicle:', vehicleError);
        // Don't fail the car service creation if vehicle registration fails
      }

      /*/ Create payment record
      const paymentData = {
        source: 'CARWASH',
        source_id: carService.id,
        transaction_type: 'credit',
        payment_mode: payment_mode,
        amount: parseFloat(amount),
        ref: payment_ref,
        description: `Car wash service for ${regno} - ${service}`
      };
      
      await Payment.create(paymentData);*/

      res.status(201).json({
        success: true,
        message: 'Car service registered successfully',
        data: carService
      });
    } catch (error) {
      console.error('Error creating car service:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating car service',
        error: error.message
      });
    }
  }

  /**
   * Get all car services with optional filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllCarServices(req, res) {
    try {
      const {
        branch_id,
        regno,
        model,
        service,
        payment_mode,
        start_date,
        end_date,
        page = 1,
        limit = 50
      } = req.query;

      const filters = {
        branch_id,
        regno,
        model,
        service,
        payment_mode,
        start_date,
        end_date
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const carServices = await CarRegistry.findAll(filters);

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedServices = carServices.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedServices,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(carServices.length / limit),
          total_services: carServices.length,
          has_next: endIndex < carServices.length,
          has_prev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching car services:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching car services',
        error: error.message
      });
    }
  }

  /**
   * Get car service by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCarServiceById(req, res) {
    try {
      const { id } = req.params;

      // Validate ID format
      if (id.length !== 15) {
        return res.status(400).json({
          success: false,
          message: 'Invalid ID format. Expected yyyddmmhhMMsss format (15 characters)'
        });
      }

      const carService = await CarRegistry.findById(id);

      if (!carService) {
        return res.status(404).json({
          success: false,
          message: 'Car service not found'
        });
      }

      // Get readable date time from ID
      const readableDateTime = CarRegistry.getReadableDateTime(id);

      res.json({
        success: true,
        data: {
          ...carService,
          readable_datetime: readableDateTime
        }
      });
    } catch (error) {
      console.error('Error fetching car service:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching car service',
        error: error.message
      });
    }
  }

  /**
   * Get readable datetime from car service ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCarServiceDateTime(req, res) {
    try {
      const { id } = req.params;

      if (id.length !== 15) {
        return res.status(400).json({
          success: false,
          message: 'Invalid ID format. Expected yyyddmmhhMMsss format (15 characters)'
        });
      }

      const readableDateTime = CarRegistry.getReadableDateTime(id);

      res.json({
        success: true,
        data: readableDateTime
      });
    } catch (error) {
      console.error('Error parsing car service ID:', error);
      res.status(500).json({
        success: false,
        message: 'Error parsing car service ID',
        error: error.message
      });
    }
  }

  /**
   * Get car services for a specific day using ID format
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCarServicesByDate(req, res) {
    try {
      const { date } = req.params;
      const { branch_id } = req.query;

      // Validate date format (YYYY-MM-DD)
      if (!this.isValidDate(date)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Use YYYY-MM-DD'
        });
      }

      let carServices;
      if (branch_id) {
        carServices = await CarRegistry.findByDate(date, branch_id);
      } else {
        carServices = await CarRegistry.findByDate(date);
      }

      // Calculate summary statistics
      const summary = {
        date: date,
        branch_id: branch_id || 'All branches',
        total_services: carServices.length,
        total_revenue: carServices.reduce((sum, service) => sum + parseFloat(service.amount || 0), 0),
        total_tips: carServices.reduce((sum, service) => sum + parseFloat(service.tip_amount || 0), 0),
        total_excess: carServices.reduce((sum, service) => sum + parseFloat(service.excess_amount || 0), 0),
        unique_cars: [...new Set(carServices.map(service => service.regno))].length
      };

      res.json({
        success: true,
        data: carServices,
        summary: summary
      });
    } catch (error) {
      console.error('Error fetching car services by date:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching car services for date',
        error: error.message
      });
    }
  }

  /**
   * Get car services with cash payments
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCashPaymentServices(req, res) {
    try {
      const { date, branch_id, page = 1, limit = 50 } = req.query;

      const carServices = await CarRegistry.findByCashPayment(date, branch_id);

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedServices = carServices.slice(startIndex, endIndex);

      const summary = {
        payment_mode: 'CASH',
        date: date || 'All time',
        branch_id: branch_id || 'All branches',
        total_services: carServices.length,
        total_revenue: carServices.reduce((sum, service) => sum + parseFloat(service.payment_amount || service.amount || 0), 0)
      };

      res.json({
        success: true,
        data: paginatedServices,
        summary: summary,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(carServices.length / limit),
          total_services: carServices.length,
          has_next: endIndex < carServices.length,
          has_prev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching cash payment services:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching cash payment services',
        error: error.message
      });
    }
  }

  /**
   * Get car services by payment mode
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getServicesByPaymentMode(req, res) {
    try {
      const { mode } = req.params;
      const { date, branch_id, page = 1, limit = 50 } = req.query;

      const validModes = ['CASH', 'MPESA', 'CARD', 'BOTH'];
      if (!validModes.includes(mode.toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payment mode. Use: CASH, MPESA, CARD, BOTH'
        });
      }

      const carServices = await CarRegistry.findByPaymentMode(mode.toUpperCase(), date, branch_id);

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedServices = carServices.slice(startIndex, endIndex);

      const summary = {
        payment_mode: mode.toUpperCase(),
        date: date || 'All time',
        branch_id: branch_id || 'All branches',
        total_services: carServices.length,
        total_revenue: carServices.reduce((sum, service) => sum + parseFloat(service.payment_amount || service.amount || 0), 0)
      };

      res.json({
        success: true,
        data: paginatedServices,
        summary: summary,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(carServices.length / limit),
          total_services: carServices.length,
          has_next: endIndex < carServices.length,
          has_prev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching services by payment mode:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching services by payment mode',
        error: error.message
      });
    }
  }

  /**
   * Get car service statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCarStatistics(req, res) {
    try {
      const { branch_id, start_date, end_date } = req.query;

      const filters = {};
      if (branch_id) filters.branch_id = branch_id;
      if (start_date) filters.start_date = start_date;
      if (end_date) filters.end_date = end_date;

      const statistics = await CarRegistry.getStatistics(filters);

      res.json({
        success: true,
        data: statistics,
        filters: filters
      });
    } catch (error) {
      console.error('Error fetching car statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching car service statistics',
        error: error.message
      });
    }
  }

  /**
   * Get daily car service report
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getDailyCarReport(req, res) {
    try {
      const { date } = req.params;
      const { branch_id } = req.query;

      // Validate date format
      if (!this.isValidDate(date)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Use YYYY-MM-DD'
        });
      }

      const report = await CarRegistry.getDailyReport(date, branch_id);

      // Calculate detailed summary
      const summary = {
        date: date,
        branch_id: branch_id || 'All branches',
        total_services: report.length,
        total_revenue: report.reduce((sum, service) => sum + parseFloat(service.amount || 0), 0),
        total_payments: report.reduce((sum, service) => sum + parseFloat(service.payment_amount || 0), 0),
        total_discounts: report.reduce((sum, service) => sum + parseFloat(service.discount_amount || 0), 0),
        total_tips: report.reduce((sum, service) => sum + parseFloat(service.tip_amount || 0), 0),
        total_excess: report.reduce((sum, service) => sum + parseFloat(service.excess_amount || 0), 0),
        unique_cars: [...new Set(report.map(service => service.regno))].length
      };

      // Payment mode breakdown
      const paymentBreakdown = report.reduce((acc, service) => {
        const mode = service.payment_mode || 'UNKNOWN';
        if (!acc[mode]) {
          acc[mode] = { count: 0, amount: 0 };
        }
        acc[mode].count++;
        acc[mode].amount += parseFloat(service.payment_amount || 0);
        return acc;
      }, {});

      // Service type breakdown
      const serviceBreakdown = report.reduce((acc, service) => {
        const serviceType = service.service || 'UNKNOWN';
        if (!acc[serviceType]) {
          acc[serviceType] = { count: 0, amount: 0 };
        }
        acc[serviceType].count++;
        acc[serviceType].amount += parseFloat(service.amount || 0);
        return acc;
      }, {});

      res.json({
        success: true,
        data: report,
        summary: summary,
        breakdown: {
          payment_modes: paymentBreakdown,
          services: serviceBreakdown
        }
      });
    } catch (error) {
      console.error('Error generating daily car report:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating daily car report',
        error: error.message
      });
    }
  }

  /**
   * Update car service record
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateCarService(req, res) {
    try {
      const { id } = req.params;
      const {
        regno,
        model,
        service,
        amount,
        tip_amount,
        excess_amount,
        branch_id
      } = req.body;

      // Validate ID format
      if (id.length !== 15) {
        return res.status(400).json({
          success: false,
          message: 'Invalid ID format. Expected yyyddmmhhMMsss format'
        });
      }

      const updateData = {};
      if (regno !== undefined) updateData.regno = regno;
      if (model !== undefined) updateData.model = model;
      if (service !== undefined) updateData.service = service;
      if (amount !== undefined) updateData.amount = parseFloat(amount);
      if (tip_amount !== undefined) updateData.tip_amount = parseFloat(tip_amount);
      if (excess_amount !== undefined) updateData.excess_amount = parseFloat(excess_amount);
      if (branch_id !== undefined) updateData.branch_id = branch_id;

      // Check if there's anything to update
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }

      const carService = await CarRegistry.update(id, updateData);

      if (!carService) {
        return res.status(404).json({
          success: false,
          message: 'Car service not found'
        });
      }

      res.json({
        success: true,
        message: 'Car service updated successfully',
        data: carService
      });
    } catch (error) {
      console.error('Error updating car service:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating car service',
        error: error.message
      });
    }
  }

  /**
   * Delete car service record
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteCarService(req, res) {
    try {
      const { id } = req.params;

      // Validate ID format
      if (id.length !== 15) {
        return res.status(400).json({
          success: false,
          message: 'Invalid ID format. Expected yyyddmmhhMMsss format'
        });
      }

      const deleted = await CarRegistry.delete(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Car service not found'
        });
      }

      res.json({
        success: true,
        message: 'Car service deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting car service:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting car service',
        error: error.message
      });
    }
  }

  /**
   * Validate date format (YYYY-MM-DD)
   * @param {string} dateString - Date string to validate
   * @returns {boolean} Validation result
   */
  isValidDate(dateString) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateString.match(regex)) return false;

    const date = new Date(dateString);
    const timestamp = date.getTime();

    if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) {
      return false;
    }

    return date.toISOString().startsWith(dateString);
  }

  /**
   * Get car services by license plate
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCarServicesByLicensePlate(req, res) {
    try {
      const { licensePlate } = req.params;
      const { page = 1, limit = 50 } = req.query;

      const carServices = await CarRegistry.findAll({ regno: licensePlate });

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedServices = carServices.slice(startIndex, endIndex);

      const summary = {
        license_plate: licensePlate,
        total_services: carServices.length,
        total_spent: carServices.reduce((sum, service) => sum + parseFloat(service.amount || 0), 0),
        first_service: carServices.length > 0 ? CarRegistry.getReadableDateTime(carServices[carServices.length - 1].id) : null,
        last_service: carServices.length > 0 ? CarRegistry.getReadableDateTime(carServices[0].id) : null
      };

      res.json({
        success: true,
        data: paginatedServices,
        summary: summary,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(carServices.length / limit),
          total_services: carServices.length,
          has_next: endIndex < carServices.length,
          has_prev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching car services by license plate:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching car services by license plate',
        error: error.message
      });
    }
  }

  /**
   * Get recent car services (last 24 hours)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getRecentCarServices(req, res) {
    try {
      const { hours = 24, branch_id, page = 1, limit = 50 } = req.query;

      // Calculate date for the last X hours
      const recentDate = new Date();
      recentDate.setHours(recentDate.getHours() - parseInt(hours));
      const dateString = recentDate.toISOString().split('T')[0];

      const carServices = await CarRegistry.findByDate(dateString, branch_id);

      // Filter services from the last X hours more precisely
      const filteredServices = carServices.filter(service => {
        const serviceDate = CarRegistry.parseId(service.id).date;
        return serviceDate >= recentDate;
      });

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedServices = filteredServices.slice(startIndex, endIndex);

      const summary = {
        period: `Last ${hours} hours`,
        branch_id: branch_id || 'All branches',
        total_services: filteredServices.length,
        total_revenue: filteredServices.reduce((sum, service) => sum + parseFloat(service.amount || 0), 0)
      };

      res.json({
        success: true,
        data: paginatedServices,
        summary: summary,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(filteredServices.length / limit),
          total_services: filteredServices.length,
          has_next: endIndex < filteredServices.length,
          has_prev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching recent car services:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching recent car services',
        error: error.message
      });
    }
  }
}

module.exports = new CarController();