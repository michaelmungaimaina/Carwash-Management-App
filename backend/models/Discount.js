const { pool } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Discount model for managing discounts
 */
class Discount {
  /**
   * Create a new discount record
   * @param {Object} discountData - Discount data
   * @returns {Promise<Object>} Created discount
   */
  static async create(discountData) {
    const { source, source_id, created_by, amount, authorised_by, auth_date } = discountData;
    const id = uuidv4();
    
    const query = `
      INSERT INTO discount (id, source, source_id, created_by, amount, authorised_by, auth_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [id, source, source_id, created_by, amount, authorised_by, auth_date];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find all discounts with optional filtering
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} List of discounts
   */
  static async findAll(filters = {}) {
    let query = `
      SELECT d.*, 
             u1.name as created_by_name,
             u2.name as authorised_by_name,
             CASE 
               WHEN d.source = 'CARWASH' THEN cr.regno
               WHEN d.source = 'CARPETS' THEN cc.client_name
             END as source_name
      FROM discount d
      LEFT JOIN users u1 ON d.created_by = u1.id
      LEFT JOIN users u2 ON d.authorised_by = u2.id
      LEFT JOIN car_registry cr ON d.source = 'CARWASH' AND d.source_id = cr.id
      LEFT JOIN carpet_registry carr ON d.source = 'CARPETS' AND d.source_id = carr.id
      LEFT JOIN carpet_clients cc ON carr.client_tag = cc.id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 0;

    if (filters.source) {
      paramCount++;
      query += ` AND d.source = $${paramCount}`;
      values.push(filters.source);
    }

    if (filters.source_id) {
      paramCount++;
      query += ` AND d.source_id = $${paramCount}`;
      values.push(filters.source_id);
    }

    if (filters.created_by) {
      paramCount++;
      query += ` AND d.created_by = $${paramCount}`;
      values.push(filters.created_by);
    }

    if (filters.authorised_by) {
      paramCount++;
      query += ` AND d.authorised_by = $${paramCount}`;
      values.push(filters.authorised_by);
    }

    if (filters.start_date && filters.end_date) {
      paramCount++;
      query += ` AND d.auth_date BETWEEN $${paramCount} AND $${paramCount + 1}`;
      values.push(filters.start_date, filters.end_date);
    }

    query += ' ORDER BY d.auth_date DESC';

    const result = await pool.query(query, values);
    return result.rows;
  }

  /**
   * Find discount by ID
   * @param {string} id - Discount ID
   * @returns {Promise<Object>} Discount data
   */
  static async findById(id) {
    const query = `
      SELECT d.*, 
             u1.name as created_by_name,
             u2.name as authorised_by_name,
             CASE 
               WHEN d.source = 'CARWASH' THEN cr.regno
               WHEN d.source = 'CARPETS' THEN cc.client_name
             END as source_name,
             CASE 
               WHEN d.source = 'CARWASH' THEN cr.service
               WHEN d.source = 'CARPETS' THEN carr.type
             END as service_type
      FROM discount d
      LEFT JOIN users u1 ON d.created_by = u1.id
      LEFT JOIN users u2 ON d.authorised_by = u2.id
      LEFT JOIN car_registry cr ON d.source = 'CARWASH' AND d.source_id = cr.id
      LEFT JOIN carpet_registry carr ON d.source = 'CARPETS' AND d.source_id = carr.id
      LEFT JOIN carpet_clients cc ON carr.client_tag = cc.id
      WHERE d.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Update discount information
   * @param {string} id - Discount ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated discount
   */
  static async update(id, updateData) {
    const { source, source_id, created_by, amount, authorised_by, auth_date } = updateData;
    
    const query = `
      UPDATE discount 
      SET source = $1, source_id = $2, created_by = $3, amount = $4, 
          authorised_by = $5, auth_date = $6
      WHERE id = $7
      RETURNING *
    `;
    
    const values = [source, source_id, created_by, amount, authorised_by, auth_date, id];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete a discount record
   * @param {string} id - Discount ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    const query = 'DELETE FROM discount WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Get discount statistics
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} Discount statistics
   */
  static async getStatistics(filters = {}) {
    let query = `
      SELECT 
        COUNT(*) as total_discounts,
        COALESCE(SUM(amount), 0) as total_discount_amount,
        source,
        COUNT(*) as source_count,
        COALESCE(SUM(amount), 0) as source_amount
      FROM discount
      WHERE 1=1
    `;
    
    const values = [];
    let paramCount = 0;

    if (filters.start_date && filters.end_date) {
      paramCount++;
      query += ` AND auth_date BETWEEN $${paramCount} AND $${paramCount + 1}`;
      values.push(filters.start_date, filters.end_date);
    }

    query += ' GROUP BY source ORDER BY source_amount DESC';

    const result = await pool.query(query, values);
    
    const stats = {
      total_discounts: 0,
      total_discount_amount: 0,
      source_breakdown: result.rows
    };

    if (result.rows.length > 0) {
      // Calculate totals
      const totalQuery = `
        SELECT 
          COUNT(*) as total_discounts,
          COALESCE(SUM(amount), 0) as total_discount_amount
        FROM discount
        WHERE 1=1
        ${filters.start_date && filters.end_date ? 'AND auth_date BETWEEN $1 AND $2' : ''}
      `;
      
      const totalResult = await pool.query(totalQuery, values);
      
      if (totalResult.rows.length > 0) {
        stats.total_discounts = parseInt(totalResult.rows[0].total_discounts);
        stats.total_discount_amount = parseFloat(totalResult.rows[0].total_discount_amount);
      }
    }

    return stats;
  }

  /**
   * Get discounts by authorizer
   * @param {string} authorizerId - User ID who authorized discounts
   * @returns {Promise<Array>} Discounts authorized by user
   */
  static async getDiscountsByAuthorizer(authorizerId) {
    const query = `
      SELECT d.*, 
             u1.name as created_by_name,
             CASE 
               WHEN d.source = 'CARWASH' THEN cr.regno
               WHEN d.source = 'CARPETS' THEN cc.client_name
             END as source_name
      FROM discount d
      LEFT JOIN users u1 ON d.created_by = u1.id
      LEFT JOIN car_registry cr ON d.source = 'CARWASH' AND d.source_id = cr.id
      LEFT JOIN carpet_registry carr ON d.source = 'CARPETS' AND d.source_id = carr.id
      LEFT JOIN carpet_clients cc ON carr.client_tag = cc.id
      WHERE d.authorised_by = $1
      ORDER BY d.auth_date DESC
    `;
    
    const result = await pool.query(query, [authorizerId]);
    return result.rows;
  }
}

module.exports = Discount;