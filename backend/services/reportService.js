const { pool } = require('../config/db');

/**
 * Report service for generating comprehensive business reports
 */
class ReportService {
  /**
   * Generate daily sales report
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string} branchId - Branch ID (optional)
   * @returns {Promise<Object>} Daily sales report
   */
  async generateDailySalesReport(date, branchId = null) {
    try {
      // Car wash services
      const carWashQuery = `
        SELECT 
          COUNT(*) as car_service_count,
          COALESCE(SUM(amount), 0) as car_service_revenue,
          COALESCE(SUM(tip_amount), 0) as total_tips,
          COALESCE(SUM(excess_amount), 0) as total_excess,
          model,
          COUNT(*) as model_count
        FROM car_registry 
        WHERE DATE(to_timestamp(updated_at)) = $1
        ${branchId ? 'AND branch_id = $2' : ''}
        GROUP BY model
        ORDER BY car_service_revenue DESC
      `;

      // Carpet services
      const carpetQuery = `
        SELECT 
          COUNT(*) as carpet_service_count,
          COALESCE(SUM(amount), 0) as carpet_service_revenue,
          type,
          COUNT(*) as type_count
        FROM carpet_registry 
        WHERE DATE(to_timestamp(updated_at)) = $1
        ${branchId ? 'AND branch_id = $2' : ''}
        GROUP BY type
        ORDER BY carpet_service_revenue DESC
      `;

      // Payments summary
      const paymentsQuery = `
        SELECT 
          p.payment_mode,
          p.transaction_type,
          COUNT(*) as transaction_count,
          COALESCE(SUM(p.amount), 0) as total_amount
        FROM payments p
        WHERE p.source_id IN (
          SELECT id FROM car_registry WHERE DATE(to_timestamp(updated_at)) = $1
          UNION 
          SELECT id FROM carpet_registry WHERE DATE(to_timestamp(updated_at)) = $1
        )
        ${branchId ? 'AND p.source_id IN (SELECT id FROM car_registry WHERE branch_id = $2 UNION SELECT id FROM carpet_registry WHERE branch_id = $2)' : ''}
        GROUP BY p.payment_mode, p.transaction_type
        ORDER BY total_amount DESC
      `;

      const values = branchId ? [date, branchId] : [date];

      const [carResults, carpetResults, paymentResults] = await Promise.all([
        pool.query(carWashQuery, values),
        pool.query(carpetQuery, values),
        pool.query(paymentsQuery, values)
      ]);

      // Calculate totals
      const totalRevenue = carResults.rows.reduce((sum, row) => sum + parseFloat(row.car_service_revenue), 0) +
                          carpetResults.rows.reduce((sum, row) => sum + parseFloat(row.carpet_service_revenue), 0);

      const totalServices = carResults.rows.reduce((sum, row) => sum + parseInt(row.car_service_count), 0) +
                           carpetResults.rows.reduce((sum, row) => sum + parseInt(row.carpet_service_count), 0);

      return {
        date,
        branch_id: branchId,
        summary: {
          total_services: totalServices,
          total_revenue: totalRevenue,
          car_services: carResults.rows.reduce((sum, row) => sum + parseInt(row.car_service_count), 0),
          carpet_services: carpetResults.rows.reduce((sum, row) => sum + parseInt(row.carpet_service_count), 0),
          total_tips: carResults.rows.reduce((sum, row) => sum + parseFloat(row.total_tips), 0),
          total_excess: carResults.rows.reduce((sum, row) => sum + parseFloat(row.total_excess), 0)
        },
        car_services: carResults.rows,
        carpet_services: carpetResults.rows,
        payments: paymentResults.rows
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate monthly performance report
   * @param {number} year - Year
   * @param {number} month - Month (1-12)
   * @param {string} branchId - Branch ID (optional)
   * @returns {Promise<Object>} Monthly performance report
   */
  async generateMonthlyReport(year, month, branchId = null) {
    try {
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      // Daily trends
      const dailyTrendsQuery = `
        SELECT 
          DATE(to_timestamp(updated_at)) as service_date,
          COUNT(*) as service_count,
          COALESCE(SUM(amount), 0) as daily_revenue
        FROM (
          SELECT updated_at, amount FROM car_registry 
          WHERE EXTRACT(YEAR FROM to_timestamp(updated_at)) = $1 
            AND EXTRACT(MONTH FROM to_timestamp(updated_at)) = $2
          ${branchId ? 'AND branch_id = $3' : ''}
          UNION ALL
          SELECT updated_at, amount FROM carpet_registry 
          WHERE EXTRACT(YEAR FROM to_timestamp(updated_at)) = $1 
            AND EXTRACT(MONTH FROM to_timestamp(updated_at)) = $2
          ${branchId ? 'AND branch_id = $3' : ''}
        ) combined
        GROUP BY DATE(to_timestamp(updated_at))
        ORDER BY service_date
      `;

      // Service type breakdown
      const serviceBreakdownQuery = `
        SELECT 
          'CARWASH' as service_type,
          model as category,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as revenue
        FROM car_registry 
        WHERE EXTRACT(YEAR FROM to_timestamp(updated_at)) = $1 
          AND EXTRACT(MONTH FROM to_timestamp(updated_at)) = $2
        ${branchId ? 'AND branch_id = $3' : ''}
        GROUP BY model
        UNION ALL
        SELECT 
          'CARPET' as service_type,
          type as category,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as revenue
        FROM carpet_registry 
        WHERE EXTRACT(YEAR FROM to_timestamp(updated_at)) = $1 
          AND EXTRACT(MONTH FROM to_timestamp(updated_at)) = $2
        ${branchId ? 'AND branch_id = $3' : ''}
        GROUP BY type
        ORDER BY revenue DESC
      `;

      // Payment method breakdown
      const paymentBreakdownQuery = `
        SELECT 
          p.payment_mode,
          COUNT(*) as transaction_count,
          COALESCE(SUM(p.amount), 0) as total_amount
        FROM payments p
        WHERE p.source_id IN (
          SELECT id FROM car_registry 
          WHERE EXTRACT(YEAR FROM to_timestamp(updated_at)) = $1 
            AND EXTRACT(MONTH FROM to_timestamp(updated_at)) = $2
          ${branchId ? 'AND branch_id = $3' : ''}
          UNION 
          SELECT id FROM carpet_registry 
          WHERE EXTRACT(YEAR FROM to_timestamp(updated_at)) = $1 
            AND EXTRACT(MONTH FROM to_timestamp(updated_at)) = $2
          ${branchId ? 'AND branch_id = $3' : ''}
        )
        GROUP BY p.payment_mode
        ORDER BY total_amount DESC
      `;

      const values = branchId ? [year, month, branchId] : [year, month];

      const [dailyTrends, serviceBreakdown, paymentBreakdown] = await Promise.all([
        pool.query(dailyTrendsQuery, values),
        pool.query(serviceBreakdownQuery, values),
        pool.query(paymentBreakdownQuery, values)
      ]);

      // Calculate monthly totals
      const totalRevenue = dailyTrends.rows.reduce((sum, row) => sum + parseFloat(row.daily_revenue), 0);
      const totalServices = dailyTrends.rows.reduce((sum, row) => sum + parseInt(row.service_count), 0);

      return {
        period: { year, month },
        branch_id: branchId,
        summary: {
          total_services: totalServices,
          total_revenue: totalRevenue,
          average_daily_revenue: totalRevenue / dailyTrends.rows.length || 0,
          busiest_day: dailyTrends.rows.reduce((max, day) => 
            parseFloat(day.daily_revenue) > parseFloat(max.daily_revenue) ? day : max, 
            { daily_revenue: 0 }
          )
        },
        daily_trends: dailyTrends.rows,
        service_breakdown: serviceBreakdown.rows,
        payment_breakdown: paymentBreakdown.rows
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate inventory usage report
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} Inventory usage report
   */
  async generateInventoryReport(filters = {}) {
    try {
      const { start_date, end_date, branch_id, category_id } = filters;

      let query = `
        SELECT 
          i.name as item_name,
          c.name as category_name,
          SUM(du.qnty) as total_quantity_used,
          SUM(du.tcost) as total_cost,
          i.unit_of_measurement,
          i.stock as current_stock,
          i.reorder_level,
          i.critical
        FROM daily_usage du
        LEFT JOIN items i ON du.item_id = i.id
        LEFT JOIN categories c ON du.category_id = c.id
        WHERE 1=1
      `;

      const values = [];
      let paramCount = 0;

      if (start_date && end_date) {
        paramCount += 2;
        query += ` AND du.recorded_at BETWEEN $${paramCount - 1} AND $${paramCount}`;
        values.push(start_date, end_date);
      }

      if (branch_id) {
        paramCount++;
        query += ` AND du.branch_id = $${paramCount}`;
        values.push(branch_id);
      }

      if (category_id) {
        paramCount++;
        query += ` AND du.category_id = $${paramCount}`;
        values.push(category_id);
      }

      query += `
        GROUP BY i.id, i.name, c.name, i.unit_of_measurement, i.stock, i.reorder_level, i.critical
        ORDER BY total_cost DESC
      `;

      const result = await pool.query(query, values);

      // Calculate summary
      const summary = {
        total_items_used: result.rows.length,
        total_quantity_used: result.rows.reduce((sum, row) => sum + parseFloat(row.total_quantity_used), 0),
        total_cost: result.rows.reduce((sum, row) => sum + parseFloat(row.total_cost), 0),
        low_stock_items: result.rows.filter(row => row.current_stock <= row.reorder_level).length,
        critical_items: result.rows.filter(row => row.critical).length
      };

      return {
        filters,
        summary,
        items: result.rows
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate customer loyalty report
   * @param {string} branchId - Branch ID (optional)
   * @returns {Promise<Object>} Customer loyalty report
   */
  async generateCustomerLoyaltyReport(branchId = null) {
    try {
      // Top car wash customers
      const carCustomersQuery = `
        SELECT 
          regno as identifier,
          COUNT(*) as visit_count,
          COALESCE(SUM(amount), 0) as total_spent,
          MIN(to_timestamp(updated_at)) as first_visit,
          MAX(to_timestamp(updated_at)) as last_visit
        FROM car_registry
        WHERE 1=1
        ${branchId ? 'AND branch_id = $1' : ''}
        GROUP BY regno
        HAVING COUNT(*) > 1
        ORDER BY visit_count DESC
        LIMIT 20
      `;

      // Top carpet cleaning clients
      const carpetCustomersQuery = `
        SELECT 
          cc.client_name,
          cc.phone,
          COUNT(cr.id) as service_count,
          COALESCE(SUM(cr.amount), 0) as total_spent,
          MIN(to_timestamp(cr.updated_at)) as first_service,
          MAX(to_timestamp(cr.updated_at)) as last_service
        FROM carpet_clients cc
        LEFT JOIN carpet_registry cr ON cc.id = cr.client_tag
        WHERE cr.id IS NOT NULL
        ${branchId ? 'AND cc.branch_id = $1' : ''}
        GROUP BY cc.id, cc.client_name, cc.phone
        HAVING COUNT(cr.id) > 0
        ORDER BY service_count DESC
        LIMIT 20
      `;

      const values = branchId ? [branchId] : [];

      const [carCustomers, carpetCustomers] = await Promise.all([
        pool.query(carCustomersQuery, values),
        pool.query(carpetCustomersQuery, values)
      ]);

      return {
        branch_id: branchId,
        top_car_customers: carCustomers.rows,
        top_carpet_customers: carpetCustomers.rows,
        summary: {
          total_repeat_car_customers: carCustomers.rows.length,
          total_repeat_carpet_customers: carpetCustomers.rows.length,
          average_visits_per_car: carCustomers.rows.reduce((sum, customer) => sum + customer.visit_count, 0) / carCustomers.rows.length || 0,
          average_services_per_carpet_client: carpetCustomers.rows.reduce((sum, customer) => sum + customer.service_count, 0) / carpetCustomers.rows.length || 0
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate financial summary report
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} Financial summary report
   */
  async generateFinancialSummary(filters = {}) {
    try {
      const { start_date, end_date, branch_id } = filters;

      // Revenue from services
      const revenueQuery = `
        SELECT 
          'CARWASH' as service_type,
          COALESCE(SUM(amount), 0) as revenue,
          COALESCE(SUM(tip_amount), 0) as tips,
          COALESCE(SUM(excess_amount), 0) as excess
        FROM car_registry 
        WHERE 1=1
        ${start_date && end_date ? 'AND updated_at BETWEEN $1 AND $2' : ''}
        ${branch_id ? `AND branch_id = $${start_date && end_date ? 3 : 1}` : ''}
        UNION ALL
        SELECT 
          'CARPET' as service_type,
          COALESCE(SUM(amount), 0) as revenue,
          0 as tips,
          0 as excess
        FROM carpet_registry 
        WHERE 1=1
        ${start_date && end_date ? 'AND updated_at BETWEEN $1 AND $2' : ''}
        ${branch_id ? `AND branch_id = $${start_date && end_date ? 3 : 1}` : ''}
      `;

      // Discounts given
      const discountsQuery = `
        SELECT 
          COALESCE(SUM(amount), 0) as total_discounts
        FROM discount 
        WHERE 1=1
        ${start_date && end_date ? 'AND auth_date BETWEEN $1 AND $2' : ''}
      `;

      // Inventory costs
      const inventoryCostsQuery = `
        SELECT 
          COALESCE(SUM(tcost), 0) as total_inventory_costs
        FROM daily_usage 
        WHERE 1=1
        ${start_date && end_date ? 'AND recorded_at BETWEEN $1 AND $2' : ''}
        ${branch_id ? `AND branch_id = $${start_date && end_date ? 3 : 1}` : ''}
      `;

      const values = [];
      if (start_date && end_date) {
        values.push(start_date, end_date);
      }
      if (branch_id) {
        values.push(branch_id);
      }

      const [revenueResult, discountsResult, inventoryResult] = await Promise.all([
        pool.query(revenueQuery, values),
        pool.query(discountsQuery, start_date && end_date ? [start_date, end_date] : []),
        pool.query(inventoryCostsQuery, values)
      ]);

      const carwashData = revenueResult.rows.find(r => r.service_type === 'CARWASH') || { revenue: 0, tips: 0, excess: 0 };
      const carpetData = revenueResult.rows.find(r => r.service_type === 'CARPET') || { revenue: 0 };

      const totalRevenue = parseFloat(carwashData.revenue) + parseFloat(carpetData.revenue);
      const totalDiscounts = parseFloat(discountsResult.rows[0]?.total_discounts || 0);
      const totalInventoryCosts = parseFloat(inventoryResult.rows[0]?.total_inventory_costs || 0);
      const netRevenue = totalRevenue - totalDiscounts - totalInventoryCosts;

      return {
        period: { start_date, end_date },
        branch_id,
        revenue: {
          carwash: parseFloat(carwashData.revenue),
          carpet: parseFloat(carpetData.revenue),
          total: totalRevenue,
          tips: parseFloat(carwashData.tips),
          excess: parseFloat(carwashData.excess)
        },
        costs: {
          discounts: totalDiscounts,
          inventory: totalInventoryCosts,
          total: totalDiscounts + totalInventoryCosts
        },
        summary: {
          net_revenue: netRevenue,
          profit_margin: totalRevenue > 0 ? (netRevenue / totalRevenue) * 100 : 0
        }
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new ReportService();