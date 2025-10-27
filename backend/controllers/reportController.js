const ReportService = require('../services/reportService');

/**
 * Report controller for generating various business reports
 */
class ReportController {
  /**
   * Generate daily sales report
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async generateDailySalesReport(req, res) {
    try {
      const { date } = req.params;
      const { branch_id } = req.query;
      
      const report = await ReportService.generateDailySalesReport(date, branch_id);
      
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error generating daily sales report',
        error: error.message
      });
    }
  }

  /**
   * Generate monthly performance report
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async generateMonthlyReport(req, res) {
    try {
      const { year, month } = req.params;
      const { branch_id } = req.query;
      
      const report = await ReportService.generateMonthlyReport(
        parseInt(year), 
        parseInt(month), 
        branch_id
      );
      
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error generating monthly report',
        error: error.message
      });
    }
  }

  /**
   * Generate inventory usage report
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async generateInventoryReport(req, res) {
    try {
      const filters = req.query;
      const report = await ReportService.generateInventoryReport(filters);
      
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error generating inventory report',
        error: error.message
      });
    }
  }

  /**
   * Generate customer loyalty report
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async generateCustomerLoyaltyReport(req, res) {
    try {
      const { branch_id } = req.query;
      const report = await ReportService.generateCustomerLoyaltyReport(branch_id);
      
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error generating customer loyalty report',
        error: error.message
      });
    }
  }

  /**
   * Generate financial summary report
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async generateFinancialSummary(req, res) {
    try {
      const filters = req.query;
      const report = await ReportService.generateFinancialSummary(filters);
      
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error generating financial summary',
        error: error.message
      });
    }
  }

  /**
   * Generate comprehensive business report
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async generateComprehensiveReport(req, res) {
    try {
      const { start_date, end_date, branch_id } = req.query;
      
      const [
        financialSummary,
        inventoryReport,
        customerLoyaltyReport
      ] = await Promise.all([
        ReportService.generateFinancialSummary({ start_date, end_date, branch_id }),
        ReportService.generateInventoryReport({ start_date, end_date, branch_id }),
        ReportService.generateCustomerLoyaltyReport(branch_id)
      ]);
      
      const comprehensiveReport = {
        period: { start_date, end_date },
        branch_id,
        financial_summary: financialSummary,
        inventory_usage: inventoryReport,
        customer_loyalty: customerLoyaltyReport
      };
      
      res.json({
        success: true,
        data: comprehensiveReport
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error generating comprehensive report',
        error: error.message
      });
    }
  }
}

module.exports = new ReportController();