const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const User = require('../models/userModel');

/**
 * Authentication service for handling JWT tokens and user authentication
 */8
class AuthService {
  /**
   * Generate JWT token for user
   * @param {Object} user - User object
   * @returns {string} JWT token
   */
  generateToken(user) {
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      access_level: user.access_level,
      branch_id: user.branch_id
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @returns {Object} Decoded token payload
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Authenticate user with username and password
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Promise<Object>} User object and token
   */
  async authenticate(username, password) {
    try {
      // Find user by username
      const user = await User.findByUsername(username);
      if (!user) {
        throw new Error('Invalid credentials');
      }

      /*/ Verify password
      const isPasswordValid = await User.verifyPassword(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }*/

      // Generate token
      const token = this.generateToken(user);

      // Remove password from user object
      const { password: _, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        token
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Validate user permissions
   * @param {Object} user - User object
   * @param {Array} allowedRoles - Allowed roles
   * @param {Array} allowedAccessLevels - Allowed access levels
   * @returns {boolean} Permission status
   */
  hasPermission(user, allowedRoles = [], allowedAccessLevels = []) {
    if (!user) return false;

    const hasRole = allowedRoles.length === 0 || allowedRoles.includes(user.role);
    const hasAccessLevel = allowedAccessLevels.length === 0 || allowedAccessLevels.includes(user.access_level);

    return hasRole && hasAccessLevel;
  }

  /**
   * Middleware to verify JWT token
   * @returns {Function} Express middleware
   */
  verifyTokenMiddleware() {
    return (req, res, next) => {
      const token = req.header('Authorization')?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Access denied. No token provided.'
        });
      }

      try {
        const decoded = this.verifyToken(token);
        req.user = decoded;
        next();
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid token.'
        });
      }
    };
  }

  /**
   * Middleware to check user permissions
   * @param {Array} allowedRoles - Allowed roles
   * @param {Array} allowedAccessLevels - Allowed access levels
   * @returns {Function} Express middleware
   */
  requirePermission(allowedRoles = [], allowedAccessLevels = []) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const hasPermission = this.hasPermission(req.user, allowedRoles, allowedAccessLevels);

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      next();
    };
  }

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} Success status
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await User.verifyPassword(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Update to new password
      await User.updatePassword(userId, newPassword);

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object} Validation result
   */
  validatePasswordStrength(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const isValid = password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;

    return {
      isValid,
      requirements: {
        minLength: password.length >= minLength,
        hasUpperCase,
        hasLowerCase,
        hasNumbers,
        hasSpecialChar
      }
    };
  }
}

module.exports = new AuthService();