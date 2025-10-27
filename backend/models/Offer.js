const { db } = require('../config/env');

/**
 * Offer model for managing promotional offers
 */
class Offer {
  /**
   * Create a new offer
   * @param {Object} offerData - Offer data
   * @returns {Promise<Object>} Created offer
   */
  static async create(offerData) {
    const {
      name,
      description,
      visit_threshold,
      discount_type,
      discount_value,
      is_active = true,
      valid_from,
      valid_until
    } = offerData;

    // Validate required fields
    if (!name || !visit_threshold || !discount_type) {
      throw new Error('Name, visit threshold, and discount type are required');
    }

    // Validate discount type
    const validDiscountTypes = ['percentage', 'fixed_amount', 'free_wash'];
    if (!validDiscountTypes.includes(discount_type)) {
      throw new Error('Invalid discount type. Must be: percentage, fixed_amount, or free_wash');
    }

    // Validate discount value based on type
    if (discount_type !== 'free_wash' && (!discount_value || discount_value <= 0)) {
      throw new Error('Discount value is required and must be positive for non-free wash offers');
    }

    // For free_wash, discount_value should be null or 0
    if (discount_type === 'free_wash' && discount_value && discount_value > 0) {
      throw new Error('Discount value should be null or 0 for free_wash offers');
    }

    const query = `
      INSERT INTO offers (name, description, visit_threshold, discount_type, discount_value, is_active, valid_from, valid_until)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      name,
      description || null,
      visit_threshold,
      discount_type,
      discount_type === 'free_wash' ? 0 : discount_value,
      is_active,
      valid_from || null,
      valid_until || null
    ];

    try {
      const [result] = await db.execute(query, values);
      const [offers] = await db.execute('SELECT * FROM offers WHERE id = ?', [result.insertId]);
      return offers[0];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find all offers with optional filtering
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} List of offers
   */
  static async findAll(filters = {}) {
    let query = 'SELECT * FROM offers WHERE 1=1';
    const values = [];
    let paramCount = 0;

    if (filters.is_active !== undefined) {
      paramCount++;
      query += ` AND is_active = ?`;
      values.push(filters.is_active);
    }

    if (filters.discount_type) {
      paramCount++;
      query += ` AND discount_type = ?`;
      values.push(filters.discount_type);
    }

    if (filters.min_visit_threshold) {
      paramCount++;
      query += ` AND visit_threshold >= ?`;
      values.push(parseInt(filters.min_visit_threshold));
    }

    if (filters.max_visit_threshold) {
      paramCount++;
      query += ` AND visit_threshold <= ?`;
      values.push(parseInt(filters.max_visit_threshold));
    }

    if (filters.current_date) {
      paramCount++;
      query += ` AND (valid_from IS NULL OR valid_from <= ?) 
                AND (valid_until IS NULL OR valid_until >= ?)`;
      values.push(filters.current_date, filters.current_date);
    }

    if (filters.name) {
      paramCount++;
      query += ` AND name LIKE ?`;
      values.push(`%${filters.name}%`);
    }

    // Sorting
    if (filters.sort_by) {
      const sortOrder = filters.sort_order === 'asc' ? 'ASC' : 'DESC';
      const validSortFields = ['visit_threshold', 'discount_value', 'created_at', 'valid_from', 'valid_until'];
      
      if (validSortFields.includes(filters.sort_by)) {
        query += ` ORDER BY ${filters.sort_by} ${sortOrder}`;
      } else {
        query += ` ORDER BY visit_threshold ASC, created_at DESC`;
      }
    } else {
      query += ` ORDER BY visit_threshold ASC, created_at DESC`;
    }

    try {
      const [offers] = await db.execute(query, values);
      return offers;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find offer by ID
   * @param {number} id - Offer ID
   * @returns {Promise<Object>} Offer data
   */
  static async findById(id) {
    const query = 'SELECT * FROM offers WHERE id = ?';
    
    try {
      const [offers] = await db.execute(query, [id]);
      return offers[0] || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find offer by name
   * @param {string} name - Offer name
   * @returns {Promise<Object>} Offer data
   */
  static async findByName(name) {
    const query = 'SELECT * FROM offers WHERE name = ?';
    
    try {
      const [offers] = await db.execute(query, [name]);
      return offers[0] || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update offer information
   * @param {number} id - Offer ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated offer
   */
  static async update(id, updateData) {
    const {
      name,
      description,
      visit_threshold,
      discount_type,
      discount_value,
      is_active,
      valid_from,
      valid_until
    } = updateData;

    const query = `
      UPDATE offers 
      SET 
        ${name !== undefined ? 'name = ?,' : ''}
        ${description !== undefined ? 'description = ?,' : ''}
        ${visit_threshold !== undefined ? 'visit_threshold = ?,' : ''}
        ${discount_type !== undefined ? 'discount_type = ?,' : ''}
        ${discount_value !== undefined ? 'discount_value = ?,' : ''}
        ${is_active !== undefined ? 'is_active = ?,' : ''}
        ${valid_from !== undefined ? 'valid_from = ?,' : ''}
        ${valid_until !== undefined ? 'valid_until = ?,' : ''}
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    // Remove trailing comma
    const cleanQuery = query.replace(/,\s+WHERE/, ' WHERE');
    
    const values = [];
    if (name !== undefined) values.push(name);
    if (description !== undefined) values.push(description);
    if (visit_threshold !== undefined) values.push(visit_threshold);
    if (discount_type !== undefined) values.push(discount_type);
    if (discount_value !== undefined) values.push(discount_value);
    if (is_active !== undefined) values.push(is_active);
    if (valid_from !== undefined) values.push(valid_from);
    if (valid_until !== undefined) values.push(valid_until);
    values.push(id);

    try {
      const [result] = await db.execute(cleanQuery, values);
      if (result.affectedRows === 0) {
        return null;
      }
      return await this.findById(id);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete an offer
   * @param {number} id - Offer ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    const query = 'DELETE FROM offers WHERE id = ?';
    
    try {
      const [result] = await db.execute(query, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get active offers for a specific date
   * @param {string} date - Date to check (YYYY-MM-DD format)
   * @returns {Promise<Array>} Active offers
   */
  static async getActiveOffers(date = null) {
    const checkDate = date || new Date().toISOString().split('T')[0];
    
    const query = `
      SELECT * FROM offers 
      WHERE is_active = true 
        AND (valid_from IS NULL OR valid_from <= ?)
        AND (valid_until IS NULL OR valid_until >= ?)
      ORDER BY visit_threshold ASC
    `;
    
    try {
      const [offers] = await db.execute(query, [checkDate, checkDate]);
      return offers;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get offers that are currently valid
   * @returns {Promise<Array>} Currently valid offers
   */
  static async getCurrentlyValidOffers() {
    const query = `
      SELECT * FROM offers 
      WHERE is_active = true 
        AND (valid_from IS NULL OR valid_from <= CURDATE())
        AND (valid_until IS NULL OR valid_until >= CURDATE())
      ORDER BY visit_threshold ASC
    `;
    
    try {
      const [offers] = await db.execute(query);
      return offers;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get offers expiring soon
   * @param {number} days - Number of days to check
   * @returns {Promise<Array>} Offers expiring soon
   */
  static async getOffersExpiringSoon(days = 7) {
    const query = `
      SELECT * FROM offers 
      WHERE is_active = true 
        AND valid_until IS NOT NULL
        AND valid_until <= DATE_ADD(CURRENT_DATE, INTERVAL ? DAY)
        AND valid_until >= CURRENT_DATE
      ORDER BY valid_until ASC
    `;
    
    try {
      const [offers] = await db.execute(query, [days]);
      return offers;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get offers starting soon
   * @param {number} days - Number of days to check
   * @returns {Promise<Array>} Offers starting soon
   */
  static async getOffersStartingSoon(days = 7) {
    const query = `
      SELECT * FROM offers 
      WHERE is_active = true 
        AND valid_from IS NOT NULL
        AND valid_from <= DATE_ADD(CURRENT_DATE, INTERVAL ? DAY)
        AND valid_from >= CURRENT_DATE
      ORDER BY valid_from ASC
    `;
    
    try {
      const [offers] = await db.execute(query, [days]);
      return offers;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get offer statistics
   * @returns {Promise<Object>} Offer statistics
   */
  static async getStatistics() {
    const query = `
      SELECT 
        COUNT(*) as total_offers,
        COUNT(*) FILTER (WHERE is_active = true) as active_offers,
        COUNT(*) FILTER (WHERE is_active = false) as inactive_offers,
        discount_type,
        COUNT(*) as type_count,
        AVG(visit_threshold) as average_visit_threshold,
        COUNT(*) FILTER (WHERE valid_until IS NOT NULL AND valid_until < CURRENT_DATE) as expired_offers,
        COUNT(*) FILTER (WHERE valid_from IS NOT NULL AND valid_from > CURRENT_DATE) as upcoming_offers
      FROM offers
      GROUP BY discount_type
    `;
    
    try {
      const [stats] = await db.execute(query);
      
      const result = {
        total_offers: 0,
        active_offers: 0,
        inactive_offers: 0,
        average_visit_threshold: 0,
        expired_offers: 0,
        upcoming_offers: 0,
        type_breakdown: stats
      };

      if (stats.length > 0) {
        const totalQuery = `
          SELECT 
            COUNT(*) as total_offers,
            COUNT(*) FILTER (WHERE is_active = true) as active_offers,
            COUNT(*) FILTER (WHERE is_active = false) as inactive_offers,
            AVG(visit_threshold) as average_visit_threshold,
            COUNT(*) FILTER (WHERE valid_until IS NOT NULL AND valid_until < CURRENT_DATE) as expired_offers,
            COUNT(*) FILTER (WHERE valid_from IS NOT NULL AND valid_from > CURRENT_DATE) as upcoming_offers
          FROM offers
        `;
        
        const [totalStats] = await db.execute(totalQuery);
        
        if (totalStats.length > 0) {
          result.total_offers = parseInt(totalStats[0].total_offers);
          result.active_offers = parseInt(totalStats[0].active_offers);
          result.inactive_offers = parseInt(totalStats[0].inactive_offers);
          result.average_visit_threshold = parseFloat(totalStats[0].average_visit_threshold) || 0;
          result.expired_offers = parseInt(totalStats[0].expired_offers);
          result.upcoming_offers = parseInt(totalStats[0].upcoming_offers);
        }
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if offer name already exists
   * @param {string} name - Offer name to check
   * @param {number} excludeId - Offer ID to exclude (for updates)
   * @returns {Promise<boolean>} Exists status
   */
  static async nameExists(name, excludeId = null) {
    let query = 'SELECT COUNT(*) as count FROM offers WHERE name = ?';
    const values = [name];
    
    if (excludeId) {
      query += ' AND id != ?';
      values.push(excludeId);
    }
    
    try {
      const [result] = await db.execute(query, values);
      return parseInt(result[0].count) > 0;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get offers by visit threshold range
   * @param {number} minThreshold - Minimum visit threshold
   * @param {number} maxThreshold - Maximum visit threshold
   * @returns {Promise<Array>} Offers in threshold range
   */
  static async getOffersByThresholdRange(minThreshold, maxThreshold) {
    const query = `
      SELECT * FROM offers 
      WHERE is_active = true 
        AND visit_threshold BETWEEN ? AND ?
        AND (valid_from IS NULL OR valid_from <= CURDATE())
        AND (valid_until IS NULL OR valid_until >= CURDATE())
      ORDER BY visit_threshold ASC
    `;
    
    try {
      const [offers] = await db.execute(query, [minThreshold, maxThreshold]);
      return offers;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Bulk update offer status
   * @param {Array} offerIds - Array of offer IDs
   * @param {boolean} isActive - New status
   * @returns {Promise<number>} Number of offers updated
   */
  static async bulkUpdateStatus(offerIds, isActive) {
    if (!Array.isArray(offerIds) || offerIds.length === 0) {
      throw new Error('Offer IDs array is required');
    }

    const placeholders = offerIds.map(() => '?').join(',');
    const query = `
      UPDATE offers 
      SET is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id IN (${placeholders})
    `;
    
    const values = [isActive, ...offerIds];

    try {
      const [result] = await db.execute(query, values);
      return result.affectedRows;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Search offers by name or description
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Matching offers
   */
  static async search(searchTerm) {
    const query = `
      SELECT * FROM offers 
      WHERE name LIKE ? OR description LIKE ?
      ORDER BY 
        CASE 
          WHEN name LIKE ? THEN 1
          ELSE 2
        END,
        visit_threshold ASC
    `;
    
    const searchPattern = `%${searchTerm}%`;
    
    try {
      const [offers] = await db.execute(query, [
        searchPattern,
        searchPattern,
        `${searchTerm}%`
      ]);
      return offers;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Offer;