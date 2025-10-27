const express = require('express');
const cors = require('cors');
const path = require('path');
const {PORT } = require('./config/env');
const {testConnection } = require('./config/db');
const routes = require('./routes');

/**
 * Main application entry point
 */
class App {
  constructor() {
    this.app = express();
    this.port = PORT;
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Initialize application middlewares
   */
  initializeMiddlewares() {
    // CORS middleware
    this.app.use(cors());
    
    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Static file serving for uploads
    this.app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
    
    // Request logging middleware
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Initialize application routes
   */
  initializeRoutes() {
    // API routes
    this.app.use('/api', routes);
    
    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        message: 'Car Wash Management System API',
        version: '1.0.0',
        endpoints: {
          branches: '/api/branches',
          users: '/api/users',
          cars: '/api/cars',
          carpets: '/api/carpets',
          inventory: '/api/inventory',
          payments: '/api/payments',
          discounts: '/api/discounts',
          vehicles: '/api/vehicles',
          reports: '/api/reports'
        }
      });
    });
    
    // Handle 404 - Route not found
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    });
  }

  /**
   * Initialize error handling middleware
   */
  initializeErrorHandling() {
    // Global error handler
    this.app.use((error, req, res, next) => {
      console.error('Global error handler:', error);
      
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    });
  }

  /**
   * Start the application server
   */
  async start() {
    try {
      // Test database connection
      await testConnection();
      
      // Start server
      this.app.listen(this.port, () => {
        console.log(`Server is running on port ${this.port}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      });
    } catch (error) {
      console.error('Failed to start application:', error);
      process.exit(1);
    }
  }
}

// Create and start application instance
const application = new App();
application.start();

module.exports = application.app;