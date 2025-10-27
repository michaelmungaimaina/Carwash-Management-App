const Branch = require('../models/Branch');

/**
 * Branch Controller for handling branch operations
 */
class BranchController {
  /**
   * Create a new branch
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createBranch(req, res) {
    try {
      const { name, location } = req.body;

      // Validate required fields
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Branch name is required'
        });
      }

      // Check if branch name already exists
      const existingBranch = await Branch.findByName(name);
      if (existingBranch) {
        return res.status(400).json({
          success: false,
          message: 'Branch name already exists'
        });
      }

      const branchData = { name, location };
      const branch = await Branch.create(branchData);
      
      res.status(201).json({
        success: true,
        message: 'Branch created successfully',
        data: branch
      });
    } catch (error) {
      console.error('Error creating branch:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating branch',
        error: error.message
      });
    }
  }

  /**
   * Get all branches with optional filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllBranches(req, res) {
    try {
      const { name, location, with_stats, page = 1, limit = 50 } = req.query;

      const filters = { name, location };

      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      let branches;
      if (with_stats === 'true') {
        branches = await Branch.getAllWithStats();
      } else {
        branches = await Branch.findAll(filters);
      }
      
      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedBranches = branches.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedBranches,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(branches.length / limit),
          total_branches: branches.length,
          has_next: endIndex < branches.length,
          has_prev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching branches:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching branches',
        error: error.message
      });
    }
  }

  /**
   * Get branch by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getBranchById(req, res) {
    try {
      const { id } = req.params;
      
      // Validate ID format
      if (!Branch.isValidId(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid branch ID format. Expected BRN001 format'
        });
      }

      const branch = await Branch.findById(id);
      
      if (!branch) {
        return res.status(404).json({
          success: false,
          message: 'Branch not found'
        });
      }
      
      res.json({
        success: true,
        data: branch
      });
    } catch (error) {
      console.error('Error fetching branch:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching branch',
        error: error.message
      });
    }
  }

  /**
   * Update branch
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateBranch(req, res) {
    try {
      const { id } = req.params;
      const { name, location } = req.body;
      
      // Validate ID format
      if (!Branch.isValidId(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid branch ID format. Expected BRN001 format'
        });
      }

      // Check if branch exists
      const existingBranch = await Branch.findById(id);
      if (!existingBranch) {
        return res.status(404).json({
          success: false,
          message: 'Branch not found'
        });
      }

      // Check if new name already exists (excluding current branch)
      if (name && name !== existingBranch.name) {
        const nameExists = await Branch.nameExists(name, id);
        if (nameExists) {
          return res.status(400).json({
            success: false,
            message: 'Branch name already exists'
          });
        }
      }

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (location !== undefined) updateData.location = location;

      // Check if there's anything to update
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }

      const branch = await Branch.update(id, updateData);
      
      res.json({
        success: true,
        message: 'Branch updated successfully',
        data: branch
      });
    } catch (error) {
      console.error('Error updating branch:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating branch',
        error: error.message
      });
    }
  }

  /**
   * Delete branch
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteBranch(req, res) {
    try {
      const { id } = req.params;
      
      // Validate ID format
      if (!Branch.isValidId(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid branch ID format. Expected BRN001 format'
        });
      }

      // Check if branch exists
      const existingBranch = await Branch.findById(id);
      if (!existingBranch) {
        return res.status(404).json({
          success: false,
          message: 'Branch not found'
        });
      }

      // Check if branch has associated data (users, services, etc.)
      const stats = await Branch.getStatistics(id);
      if (stats.totalUsers > 0 || stats.totalCars > 0 || stats.totalCarpets > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete branch with associated users or services. Please reassign or delete associated data first.',
          associated_data: stats
        });
      }

      const deleted = await Branch.delete(id);
      
      res.json({
        success: true,
        message: 'Branch deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting branch:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting branch',
        error: error.message
      });
    }
  }

  /**
   * Get branch statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getBranchStatistics(req, res) {
    try {
      const { id } = req.params;
      
      // Validate ID format
      if (!Branch.isValidId(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid branch ID format. Expected BRN001 format'
        });
      }

      // Check if branch exists
      const existingBranch = await Branch.findById(id);
      if (!existingBranch) {
        return res.status(404).json({
          success: false,
          message: 'Branch not found'
        });
      }

      const statistics = await Branch.getStatistics(id);
      
      res.json({
        success: true,
        data: {
          branch: existingBranch,
          statistics: statistics
        }
      });
    } catch (error) {
      console.error('Error fetching branch statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching branch statistics',
        error: error.message
      });
    }
  }

  /**
   * Search branches
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async searchBranches(req, res) {
    try {
      const { q, page = 1, limit = 50 } = req.query;
      
      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const branches = await Branch.search(q);
      
      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedBranches = branches.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedBranches,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(branches.length / limit),
          total_branches: branches.length,
          has_next: endIndex < branches.length,
          has_prev: page > 1
        }
      });
    } catch (error) {
      console.error('Error searching branches:', error);
      res.status(500).json({
        success: false,
        message: 'Error searching branches',
        error: error.message
      });
    }
  }

  /**
   * Get branches with statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getBranchesWithStats(req, res) {
    try {
      const { page = 1, limit = 50 } = req.query;

      const branches = await Branch.getAllWithStats();
      
      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedBranches = branches.slice(startIndex, endIndex);

      // Calculate overall totals
      const overallStats = {
        total_branches: branches.length,
        total_users: branches.reduce((sum, branch) => sum + parseInt(branch.user_count || 0), 0),
        total_car_services: branches.reduce((sum, branch) => sum + parseInt(branch.car_service_count || 0), 0),
        total_carpet_services: branches.reduce((sum, branch) => sum + parseInt(branch.carpet_service_count || 0), 0),
        total_revenue: branches.reduce((sum, branch) => sum + parseFloat(branch.total_revenue || 0), 0)
      };

      res.json({
        success: true,
        data: paginatedBranches,
        overall_stats: overallStats,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(branches.length / limit),
          total_branches: branches.length,
          has_next: endIndex < branches.length,
          has_prev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching branches with statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching branches with statistics',
        error: error.message
      });
    }
  }

  /**
   * Validate branch ID format
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async validateBranchId(req, res) {
    try {
      const { id } = req.params;
      
      const isValid = Branch.isValidId(id);
      let branch = null;
      
      if (isValid) {
        branch = await Branch.findById(id);
      }
      
      res.json({
        success: true,
        data: {
          id: id,
          valid_format: isValid,
          exists: !!branch,
          branch: branch
        }
      });
    } catch (error) {
      console.error('Error validating branch ID:', error);
      res.status(500).json({
        success: false,
        message: 'Error validating branch ID',
        error: error.message
      });
    }
  }

  /**
   * Get next available branch ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getNextBranchId(req, res) {
    try {
      const nextId = await Branch.generateNextId();
      
      res.json({
        success: true,
        data: {
          next_id: nextId
        }
      });
    } catch (error) {
      console.error('Error generating next branch ID:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating next branch ID',
        error: error.message
      });
    }
  }
}

module.exports = new BranchController();