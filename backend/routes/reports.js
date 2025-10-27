const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authService = require('../services/authService');

/**
 * Report routes for generating business reports
 */

// Apply authentication middleware to all routes
router.use(authService.verifyTokenMiddleware());

// GET /api/reports/daily-sales/:date - Generate daily sales report
router.get('/daily-sales/:date', reportController.generateDailySalesReport);

// GET /api/reports/monthly/:year/:month - Generate monthly performance report
router.get('/monthly/:year/:month', reportController.generateMonthlyReport);

// GET /api/reports/inventory - Generate inventory usage report
router.get('/inventory', reportController.generateInventoryReport);

// GET /api/reports/customer-loyalty - Generate customer loyalty report
router.get('/customer-loyalty', reportController.generateCustomerLoyaltyReport);

// GET /api/reports/financial-summary - Generate financial summary report
router.get('/financial-summary', reportController.generateFinancialSummary);

// GET /api/reports/comprehensive - Generate comprehensive business report
router.get('/comprehensive', reportController.generateComprehensiveReport);

module.exports = router;