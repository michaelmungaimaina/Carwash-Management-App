const { pool } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Payment model for managing payments
 */
class Payment {
  /**
   * Create a new payment record
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} Created payment
   */
  static async create(paymentData) {
    const { source, source_id, transaction_type, payment_mode, amount, ref, description } = paymentData;
    const id = uuidv4();
    
    const query = `
      INSERT INTO payments (id, source, source_id, transaction_type, payment_mode, amount, ref, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [id, source, source_id, transaction_type, payment_mode, amount, ref, description];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find all payments with optional filtering
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} List of payments
   */
  static async findAll(filters = {}) {
    let query = `
      SELECT p.*,
             CASE 
               WHEN p.source = 'CARWASH' THEN cr.regno
               WHEN p.source = 'CARPETS' THEN cc.client_name
             END as source_name
      FROM payments p
      LEFT JOIN car_registry cr ON p.source = 'CARWASH' AND p.source_id = cr.id
      LEFT JOIN carpet_registry carr ON p.source = 'CARPETS' AND p.source_id = carr.id
      LEFT JOIN carpet_clients cc ON carr.client_tag = cc.id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 0;

    if (filters.source) {
      paramCount++;
      query += ` AND p.source = $${paramCount}`;
      values.push(filters.source);
    }

    if (filters.transaction_type) {
      paramCount++;
      query += ` AND p.transaction_type = $${paramCount}`;
      values.push(filters.transaction_type);
    }

    if (filters.payment_mode) {
      paramCount++;
      query += ` AND p.payment_mode = $${paramCount}`;
      values.push(filters.payment_mode);
    }

    if (filters.ref) {
      paramCount++;
      query += ` AND p.ref ILIKE $${paramCount}`;
      values.push(`%${filters.ref}%`);
    }

    if (filters.start_date) {
      // Assuming we can link to source tables for dates
      paramCount++;
      query += ` AND p.source_id IN (
        SELECT id FROM car_registry WHERE updated_at >= $${paramCount}
        UNION 
        SELECT id FROM carpet_registry WHERE updated_at >= $${paramCount}
      )`;
      values.push(filters.start_date);
    }

    query += ' ORDER BY p.id DESC';

    const result = await pool.query(query, values);
    return result.rows;
  }

  /**
   * Find payment by ID
   * @param {string} id - Payment ID
   * @returns {Promise<Object>} Payment data
   */
  static async findById(id) {
    const query = `
      SELECT p.*,
             CASE 
               WHEN p.source = 'CARWASH' THEN cr.regno
               WHEN p.source = 'CARPETS' THEN cc.client_name
             END as source_name,
             CASE 
               WHEN p.source = 'CARWASH' THEN cr.service
               WHEN p.source = 'CARPETS' THEN carr.type
             END as service_type
      FROM payments p
      LEFT JOIN car_registry cr ON p.source = 'CARWASH' AND p.source_id = cr.id
      LEFT JOIN carpet_registry carr ON p.source = 'CARPETS' AND p.source_id = carr.id
      LEFT JOIN carpet_clients cc ON carr.client_tag = cc.id
      WHERE p.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Update payment information
   * @param {string} id - Payment ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated payment
   */
  static async update(id, updateData) {
    const { source, source_id, transaction_type, payment_mode, amount, ref, description } = updateData;
    
    const query = `
      UPDATE payments 
      SET source = $1, source_id = $2, transaction_type = $3, payment_mode = $4, 
          amount = $5, ref = $6, description = $7
      WHERE id = $8
      RETURNING *
    `;
    
    const values = [source, source_id, transaction_type, payment_mode, amount, ref, description, id];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete a payment record
   * @param {string} id - Payment ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    const query = 'DELETE FROM payments WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Get payment statistics
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} Payment statistics
   */
  static async getStatistics(filters = {}) {
    let query = `
      SELECT 
        COUNT(*) as total_payments,
        COALESCE(SUM(amount), 0) as total_amount,
        payment_mode,
        COUNT(*) as mode_count,
        COALESCE(SUM(amount), 0) as mode_amount,
        transaction_type,
        COUNT(*) as type_count,
        COALESCE(SUM(amount), 0) as type_amount
      FROM payments
      WHERE 1=1
    `;
    
    const values = [];
    let paramCount = 0;

    if (filters.start_date) {
      paramCount++;
      query += ` AND source_id IN (
        SELECT id FROM car_registry WHERE updated_at >= $${paramCount}
        UNION 
        SELECT id FROM carpet_registry WHERE updated_at >= $${paramCount}
      )`;
      values.push(filters.start_date);
    }

    query += ' GROUP BY payment_mode, transaction_type ORDER BY mode_amount DESC';

    const result = await pool.query(query, values);
    
    const stats = {
      total_payments: 0,
      total_amount: 0,
      payment_breakdown: result.rows
    };

    if (result.rows.length > 0) {
      // Calculate totals
      const totalQuery = `
        SELECT 
          COUNT(*) as total_payments,
          COALESCE(SUM(amount), 0) as total_amount
        FROM payments
        WHERE 1=1
        ${filters.start_date ? 'AND source_id IN (SELECT id FROM car_registry WHERE updated_at >= $1 UNION SELECT id FROM carpet_registry WHERE updated_at >= $1)' : ''}
      `;
      
      const totalResult = await pool.query(totalQuery, values);
      
      if (totalResult.rows.length > 0) {
        stats.total_payments = parseInt(totalResult.rows[0].total_payments);
        stats.total_amount = parseFloat(totalResult.rows[0].total_amount);
      }
    }

    return stats;
  }

  /**
   * Get daily payment summary
   * @param {string} date - Date in epoch format
   * @returns {Promise<Object>} Daily payment summary
   */
  static async getDailySummary(date) {
    const query = `
      SELECT 
        p.payment_mode,
        p.transaction_type,
        COUNT(*) as transaction_count,
        COALESCE(SUM(p.amount), 0) as total_amount
      FROM payments p
      WHERE p.source_id IN (
        SELECT id FROM car_registry WHERE DATE(to_timestamp(updated_at)) = DATE(to_timestamp($1))
        UNION 
        SELECT id FROM carpet_registry WHERE DATE(to_timestamp(updated_at)) = DATE(to_timestamp($1))
      )
      GROUP BY p.payment_mode, p.transaction_type
      ORDER BY total_amount DESC
    `;
    
    const result = await pool.query(query, [date]);
    return result.rows;
  }
}

module.exports = Payment;