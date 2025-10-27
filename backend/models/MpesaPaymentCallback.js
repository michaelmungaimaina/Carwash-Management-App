const { pool } = require('../config/db');

/**
 * Mpesa Payment Callback model for handling M-Pesa transaction callbacks
 */
class MpesaPaymentCallback {
  /**
   * Create a new M-Pesa callback record
   * @param {Object} callbackData - Callback data
   * @returns {Promise<Object>} Created callback record
   */
  static async create(callbackData) {
    const { datetime, source, name, phone, account_no, amount, ref, status } = callbackData;
    
    const query = `
      INSERT INTO mpesa_payments_callback (datetime, source, name, phone, account_no, amount, ref, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [datetime, source, name, phone, account_no, amount, ref, status];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find all M-Pesa callbacks with optional filtering
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} List of callbacks
   */
  static async findAll(filters = {}) {
    let query = 'SELECT * FROM mpesa_payments_callback WHERE 1=1';
    const values = [];
    let paramCount = 0;

    if (filters.phone) {
      paramCount++;
      query += ` AND phone = $${paramCount}`;
      values.push(filters.phone);
    }

    if (filters.ref) {
      paramCount++;
      query += ` AND ref ILIKE $${paramCount}`;
      values.push(`%${filters.ref}%`);
    }

    if (filters.status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      values.push(filters.status);
    }

    if (filters.start_date && filters.end_date) {
      paramCount++;
      query += ` AND datetime BETWEEN $${paramCount} AND $${paramCount + 1}`;
      values.push(filters.start_date, filters.end_date);
    }

    query += ' ORDER BY id DESC';

    const result = await pool.query(query, values);
    return result.rows;
  }

  /**
   * Find callback by ID
   * @param {number} id - Callback ID
   * @returns {Promise<Object>} Callback data
   */
  static async findById(id) {
    const query = 'SELECT * FROM mpesa_payments_callback WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Update callback status
   * @param {number} id - Callback ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated callback
   */
  static async updateStatus(id, status) {
    const query = `
      UPDATE mpesa_payments_callback 
      SET status = $1 
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, [status, id]);
    return result.rows[0];
  }

  /**
   * Get M-Pesa transaction statistics
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} M-Pesa statistics
   */
  static async getStatistics(filters = {}) {
    let query = `
      SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(amount), 0) as total_amount,
        status,
        COUNT(*) as status_count,
        COALESCE(SUM(amount), 0) as status_amount
      FROM mpesa_payments_callback
      WHERE 1=1
    `;
    
    const values = [];
    let paramCount = 0;

    if (filters.start_date && filters.end_date) {
      paramCount++;
      query += ` AND datetime BETWEEN $${paramCount} AND $${paramCount + 1}`;
      values.push(filters.start_date, filters.end_date);
    }

    query += ' GROUP BY status ORDER BY status_amount DESC';

    const result = await pool.query(query, values);
    
    const stats = {
      total_transactions: 0,
      total_amount: 0,
      status_breakdown: result.rows
    };

    if (result.rows.length > 0) {
      // Calculate totals
      const totalQuery = `
        SELECT 
          COUNT(*) as total_transactions,
          COALESCE(SUM(amount), 0) as total_amount
        FROM mpesa_payments_callback
        WHERE 1=1
        ${filters.start_date && filters.end_date ? 'AND datetime BETWEEN $1 AND $2' : ''}
      `;
      
      const totalResult = await pool.query(totalQuery, values);
      
      if (totalResult.rows.length > 0) {
        stats.total_transactions = parseInt(totalResult.rows[0].total_transactions);
        stats.total_amount = parseFloat(totalResult.rows[0].total_amount);
      }
    }

    return stats;
  }

  /**
   * Find callback by reference number
   * @param {string} ref - Reference number
   * @returns {Promise<Object>} Callback data
   */
  static async findByReference(ref) {
    const query = 'SELECT * FROM mpesa_payments_callback WHERE ref = $1 ORDER BY id DESC LIMIT 1';
    const result = await pool.query(query, [ref]);
    return result.rows[0];
  }

  /**
   * Get recent transactions by phone number
   * @param {string} phone - Phone number
   * @param {number} limit - Number of transactions to return
   * @returns {Promise<Array>} Recent transactions
   */
  static async getRecentByPhone(phone, limit = 10) {
    const query = `
      SELECT * FROM mpesa_payments_callback 
      WHERE phone = $1 
      ORDER BY id DESC 
      LIMIT $2
    `;
    
    const result = await pool.query(query, [phone, limit]);
    return result.rows;
  }
}

module.exports = MpesaPaymentCallback;