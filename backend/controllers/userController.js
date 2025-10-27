const User = require('../models/userModel');
const AuthService = require('../services/authService');
const FileUploadService = require('../services/fileUploadService');

/**
 * User controller for handling user-related operations
 */
class UserController {
  /**
   * Create a new user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createUser(req, res) {
    try {
      const userData = req.body;
      
      // Check if username already exists
      const existingUser = await User.findByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists'
        });
      }

      // Check if username already exists
      const existingPhoneNumber = await User.findByPhone(userData.phone);
      if (existingPhoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already exists'
        });
      }

      const user = await User.create(userData);
      
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating user',
        error: error.message
      });
    }
  }

  /**
   * Get all users
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllUsers(req, res) {
    try {
      const filters = req.query;
      const users = await User.findAll(filters);
      
      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching users',
        error: error.message
      });
    }
  }

  /**
   * Get user by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findById(id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching user',
        error: error.message
      });
    }
  }

  /**
   * Update user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const user = await User.update(id, updateData);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.json({
        success: true,
        message: 'User updated successfully',
        data: user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating user',
        error: error.message
      });
    }
  }

  /**
   * Delete user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const deleted = await User.delete(id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting user',
        error: error.message
      });
    }
  }

  /**
   * Upload user avatar
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async uploadAvatar(req, res) {
    try {
      const { id } = req.params;
      
      const uploadResult = await FileUploadService.handleSingleUpload(req, 'avatar', 'avatars');
      
      // Update user with new avatar path
      await User.update(id, { avatar: uploadResult.url });
      
      res.json({
        success: true,
        message: 'Avatar uploaded successfully',
        data: {
          avatar_url: uploadResult.url
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error uploading avatar',
        error: error.message
      });
    }
  }

  /**
   * Change user password
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async changePassword(req, res) {
    try {
      const { id } = req.params;
      const { currentPassword, newPassword } = req.body;
      
      await AuthService.changePassword(id, currentPassword, newPassword);
      
      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get users with statistics by branch
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUsersWithStats(req, res) {
    try {
      const { branchId } = req.params;
      const users = await User.getUsersWithStats(branchId);
      
      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching users with statistics',
        error: error.message
      });
    }
  }

  /**
   * User login
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async login(req, res) {
    try {
      const { username, password } = req.body;
      
      const result = await AuthService.authenticate(username, password);
      
      res.json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new UserController();