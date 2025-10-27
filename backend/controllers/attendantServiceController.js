const AttendantModel = require('../models/AttendantService');

/**
 * Attendant Service Controller for handling attendant service operations
 */
class AttendantServiceController {
  /**
   * Create a new attendant service record
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createAttendantService(req, res) {
    try {
      const {
        car_id,
        attendant_id,
        service,
        amount
      } = req.body;

      // Validate required fields
      if (!car_id || !attendant_id || !service || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: car_id, attendant_id, service, amount'
        });
      }

      // Validate amount is a positive number
      if (isNaN(amount) || parseFloat(amount) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be a positive number'
        });
      }

      const serviceData = {
        car_id,
        attendant_id,
        service,
        amount: parseFloat(amount)
      };

      const attendantService = await AttendantModel
    .create(serviceData);
      
      res.status(201).json({
        success: true,
        message: 'Attendant service recorded successfully',
        data: attendantService
      });
    } catch (error) {
      console.error('Error creating attendant service:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating attendant service',
        error: error.message
      });
    }
  }

  /**
   * Get all attendant services with optional filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllAttendantServices(req, res) {
    try {
      const {
        attendant_id,
        car_id,
        service,
        branch_id,
        start_date,
        end_date,
        page = 1,
        limit = 50
      } = req.query;

      const filters = {
        attendant_id,
        car_id,
        service,
        branch_id,
        start_date,
        end_date
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const attendantServices = await AttendantModel
    .findAll(filters);
      
      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedServices = attendantServices.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedServices,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(attendantServices.length / limit),
          total_services: attendantServices.length,
          has_next: endIndex < attendantServices.length,
          has_prev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching attendant services:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching attendant services',
        error: error.message
      });
    }
  }

  /**
   * Get attendant service by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAttendantServiceById(req, res) {
    try {
      const { id } = req.params;
      
      // Validate ID format
      if (id.length !== 15) {
        return res.status(400).json({
          success: false,
          message: 'Invalid ID format. Expected yyyddmmhhMMsss format (15 characters)'
        });
      }

      const attendantService = await AttendantModel
    .findById(id);
      
      if (!attendantService) {
        return res.status(404).json({
          success: false,
          message: 'Attendant service not found'
        });
      }
      
      // Get readable date time from ID
      const readableDateTime = AttendantModel
    .getReadableDateTime(id);
      
      res.json({
        success: true,
        data: {
          ...attendantService,
          readable_datetime: readableDateTime
        }
      });
    } catch (error) {
      console.error('Error fetching attendant service:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching attendant service',
        error: error.message
      });
    }
  }

  /**
   * Get attendant services for a specific day
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAttendantServicesByDate(req, res) {
    try {
      const { date } = req.params;
      const { attendant_id, branch_id, page = 1, limit = 50 } = req.query;
      
      // Validate date format (YYYY-MM-DD)
      if (!this.isValidDate(date)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Use YYYY-MM-DD'
        });
      }
      
      let attendantServices;
      if (attendant_id) {
        attendantServices = await AttendantModel
    .findByDate(date, attendant_id);
      } else {
        attendantServices = await AttendantModel
    .findByDate(date);
      }

      // Filter by branch if specified
      if (branch_id) {
        attendantServices = attendantServices.filter(service => 
          service.branch_id === branch_id
        );
      }
      
      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedServices = attendantServices.slice(startIndex, endIndex);

      // Calculate summary statistics
      const summary = {
        date: date,
        attendant_id: attendant_id || 'All attendants',
        branch_id: branch_id || 'All branches',
        total_services: attendantServices.length,
        total_revenue: attendantServices.reduce((sum, service) => sum + parseFloat(service.amount || 0), 0),
        unique_attendants: [...new Set(attendantServices.map(service => service.attendant_id))].length,
        unique_cars: [...new Set(attendantServices.map(service => service.car_id))].length
      };
      
      res.json({
        success: true,
        data: paginatedServices,
        summary: summary,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(attendantServices.length / limit),
          total_services: attendantServices.length,
          has_next: endIndex < attendantServices.length,
          has_prev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching attendant services by date:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching attendant services for date',
        error: error.message
      });
    }
  }

  /**
   * Get services by attendant ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getServicesByAttendantId(req, res) {
    try {
      const { attendant_id } = req.params;
      const { start_date, end_date, service, page = 1, limit = 50 } = req.query;
      
      const filters = {};
      if (start_date) filters.start_date = start_date;
      if (end_date) filters.end_date = end_date;
      if (service) filters.service = service;

      const attendantServices = await AttendantModel
    .findByAttendantId(attendant_id, filters);
      
      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedServices = attendantServices.slice(startIndex, endIndex);

      const summary = {
        attendant_id: attendant_id,
        period: start_date && end_date ? `${start_date} to ${end_date}` : 'All time',
        total_services: attendantServices.length,
        total_revenue: attendantServices.reduce((sum, service) => sum + parseFloat(service.amount || 0), 0),
        average_service_amount: attendantServices.length > 0 ? 
          attendantServices.reduce((sum, service) => sum + parseFloat(service.amount || 0), 0) / attendantServices.length : 0
      };
      
      res.json({
        success: true,
        data: paginatedServices,
        summary: summary,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(attendantServices.length / limit),
          total_services: attendantServices.length,
          has_next: endIndex < attendantServices.length,
          has_prev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching services by attendant:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching services by attendant',
        error: error.message
      });
    }
  }

  /**
   * Get services by car ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getServicesByCarId(req, res) {
    try {
      const { car_id } = req.params;
      const { page = 1, limit = 50 } = req.query;
      
      const attendantServices = await AttendantModel
    .findByCarId(car_id);
      
      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedServices = attendantServices.slice(startIndex, endIndex);

      const summary = {
        car_id: car_id,
        total_services: attendantServices.length,
        total_amount: attendantServices.reduce((sum, service) => sum + parseFloat(service.amount || 0), 0),
        unique_attendants: [...new Set(attendantServices.map(service => service.attendant_id))].length
      };
      
      res.json({
        success: true,
        data: paginatedServices,
        summary: summary,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(attendantServices.length / limit),
          total_services: attendantServices.length,
          has_next: endIndex < attendantServices.length,
          has_prev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching services by car:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching services by car',
        error: error.message
      });
    }
  }

  /**
   * Get attendant performance statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAttendantPerformance(req, res) {
    try {
      const { attendant_id } = req.params;
      const { start_date, end_date } = req.query;
      
      const filters = {};
      if (start_date) filters.start_date = start_date;
      if (end_date) filters.end_date = end_date;

      const performance = await AttendantModel
    .getAttendantPerformance(attendant_id, filters);
      
      res.json({
        success: true,
        data: performance,
        filters: {
          attendant_id,
          start_date,
          end_date
        }
      });
    } catch (error) {
      console.error('Error fetching attendant performance:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching attendant performance',
        error: error.message
      });
    }
  }

  /**
   * Get daily attendant service report
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getDailyAttendantReport(req, res) {
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
      
      const report = await AttendantModel
    .getDailyReport(date, branch_id);
      
      // Calculate detailed summary
      const summary = {
        date: date,
        branch_id: branch_id || 'All branches',
        total_services: report.length,
        total_revenue: report.reduce((sum, service) => sum + parseFloat(service.amount || 0), 0),
        unique_attendants: [...new Set(report.map(service => service.attendant_id))].length,
        unique_cars: [...new Set(report.map(service => service.car_id))].length
      };
      
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

      // Attendant breakdown
      const attendantBreakdown = report.reduce((acc, service) => {
        const attendantName = service.attendant_name || 'UNKNOWN';
        if (!acc[attendantName]) {
          acc[attendantName] = { count: 0, amount: 0 };
        }
        acc[attendantName].count++;
        acc[attendantName].amount += parseFloat(service.amount || 0);
        return acc;
      }, {});

      res.json({
        success: true,
        data: report,
        summary: summary,
        breakdown: {
          services: serviceBreakdown,
          attendants: attendantBreakdown
        }
      });
    } catch (error) {
      console.error('Error generating daily attendant report:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating daily attendant report',
        error: error.message
      });
    }
  }

  /**
   * Update attendant service record
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateAttendantService(req, res) {
    try {
      const { id } = req.params;
      const {
        car_id,
        attendant_id,
        service,
        amount
      } = req.body;

      // Validate ID format
      if (id.length !== 15) {
        return res.status(400).json({
          success: false,
          message: 'Invalid ID format. Expected yyyddmmhhMMsss format'
        });
      }

      const updateData = {};
      if (car_id !== undefined) updateData.car_id = car_id;
      if (attendant_id !== undefined) updateData.attendant_id = attendant_id;
      if (service !== undefined) updateData.service = service;
      if (amount !== undefined) {
        if (isNaN(amount) || parseFloat(amount) <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Amount must be a positive number'
          });
        }
        updateData.amount = parseFloat(amount);
      }

      // Check if there's anything to update
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }

      const attendantService = await AttendantModel
    .update(id, updateData);
      
      if (!attendantService) {
        return res.status(404).json({
          success: false,
          message: 'Attendant service not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Attendant service updated successfully',
        data: attendantService
      });
    } catch (error) {
      console.error('Error updating attendant service:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating attendant service',
        error: error.message
      });
    }
  }

  /**
   * Delete attendant service record
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteAttendantService(req, res) {
    try {
      const { id } = req.params;
      
      // Validate ID format
      if (id.length !== 15) {
        return res.status(400).json({
          success: false,
          message: 'Invalid ID format. Expected yyyddmmhhMMsss format'
        });
      }

      const deleted = await AttendantModel
    .delete(id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Attendant service not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Attendant service deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting attendant service:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting attendant service',
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
}

module.exports = new AttendantServiceController();