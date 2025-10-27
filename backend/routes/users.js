const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authService = require('../services/authService');

/**
 * User routes for managing system users
 */

// POST /api/users/login - User login (public route)
router.post('/login', userController.login);

// Apply authentication middleware to all other routes
router.use(authService.verifyTokenMiddleware());

// GET /api/users - Get all users
router.get('/', userController.getAllUsers);

// GET /api/users/:id - Get user by ID
router.get('/:id', userController.getUserById);

// POST /api/users - Create new user (Admin/Manager only)
router.post('/',
  authService.requirePermission(['admin', 'manager','Supervisor']),
  userController.createUser
);

// PUT /api/users/:id - Update user
router.put('/:id', userController.updateUser);

// DELETE /api/users/:id - Delete user (Admin only)
router.delete('/:id',
  authService.requirePermission(['admin']),
  userController.deleteUser
);

// POST /api/users/:id/avatar - Upload user avatar
router.post('/:id/avatar', userController.uploadAvatar);

// POST /api/users/:id/change-password - Change user password
router.post('/:id/change-password', userController.changePassword);

// GET /api/users/branch/:branchId/stats - Get users with statistics by branch
router.get('/branch/:branchId/stats', userController.getUsersWithStats);

module.exports = router;