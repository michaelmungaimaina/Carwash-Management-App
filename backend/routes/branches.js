const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branchController');
const authService = require('../services/authService');

/**
 * Branch routes for managing car wash branches
 * ID Format: BRN001, BRN002, BRN003, etc.
 */

// Apply authentication middleware to all routes
router.use(authService.verifyTokenMiddleware());

// GET /api/branches - Get all branches with optional filtering
router.get('/', branchController.getAllBranches);

// GET /api/branches/with-stats - Get all branches with statistics
router.get('/with-stats', branchController.getBranchesWithStats);

// GET /api/branches/search - Search branches by name or location
router.get('/search', branchController.searchBranches);

// GET /api/branches/next-id - Get next available branch ID
router.get('/next-id', branchController.getNextBranchId);

// GET /api/branches/validate/:id - Validate branch ID format and existence
router.get('/validate/:id', branchController.validateBranchId);

// GET /api/branches/:id - Get branch by ID (BRN001 format)
router.get('/:id', branchController.getBranchById);

// GET /api/branches/:id/statistics - Get branch statistics
router.get('/:id/statistics', branchController.getBranchStatistics);

// POST /api/branches - Create new branch
router.post('/', branchController.createBranch);

// PUT /api/branches/:id - Update branch
router.put('/:id', branchController.updateBranch);

// DELETE /api/branches/:id - Delete branch
router.delete('/:id', branchController.deleteBranch);

/*/ PUT /api/branches/:id - Update branch (Admin/Manager only)
router.put('/:id',
  authService.requirePermission(['admin', 'manager']),
  branchController.updateBranch
);*/

module.exports = router;

