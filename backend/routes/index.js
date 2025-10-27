const express = require('express');
const { db } = require('../config/db');
const router = express.Router();

// Import all route files
const branchRoutes = require('./branches');
const userRoutes = require('./users');
const carRoutes = require('./cars');
//const carpetRoutes = require('./carpets');
//const inventoryRoutes = require('./inventory');
//const paymentRoutes = require('./payments');
//const discountRoutes = require('./discounts');
//const vehicleRoutes = require('./vehicles');
const vehicleRoutes = require('./cars');
const reportRoutes = require('./reports');
const attendantServiceRoutes = require('./attendantServices');
const vehicleStatsRoutes = require('./vehicleStats');
const vehicleOfferRoutes = require('./vehicleOffers');
const offerRoutes = require('./offers');

/**
 * Main router that combines all route modules
 */
// Use all routes
router.use('/branches', branchRoutes);
router.use('/users', userRoutes);
router.use('/cars', carRoutes);
//router.use('/carpets', carpetRoutes);
//router.use('/inventory', inventoryRoutes);
//router.use('/payments', paymentRoutes);
//router.use('/discounts', discountRoutes);
//router.use('/vehicles', vehicleRoutes);
router.use('/reports', reportRoutes);
router.use('/attendant-services', attendantServiceRoutes);
router.use('/vehicle-stats', vehicleStatsRoutes);
router.use('/vehicle-offers', vehicleOfferRoutes);
router.use('/offers', offerRoutes);

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT NOW() AS now');
    const dbTime = rows[0].current_time;

    res.json({
      success: true,
      message: 'Car Wash Management API is running',
      database_time: dbTime,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});


module.exports = router;