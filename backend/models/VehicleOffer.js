const { db } = require('../config/db');

/**
 * Vehicle Offer model for tracking offers given to specific vehicles
 */
class VehicleOffer {
  /**
   * Create a new vehicle offer record
   * @param {Object} offerData - Vehicle offer data
   * @returns {Promise<Object>} Created vehicle offer
   */
  static async create(offerData) {
    const {
      vehicle_id,
      offer_id,
      earned_on_visit_id,
      issued_date,
      used_date,
      used_on_visit_id,
      status = 'active',
      notes
    } = offerData;

    // Validate required fields
    if (!vehicle_id || !offer_id) {
      throw new Error('Vehicle ID and Offer ID are required');
    }

    const query = `
      INSERT INTO vehicle_offers (vehicle_id, offer_id, earned_on_visit_id, issued_date, 
                                 used_date, used_on_visit_id, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      vehicle_id,
      offer_id,
      earned_on_visit_id || null,
      issued_date || new Date(),
      used_date || null,
      used_on_visit_id || null,
      status,
      notes || null
    ];

    try {
      const [result] = await db.execute(query, values);
      const [offers] = await db.execute('SELECT * FROM vehicle_offers WHERE id = ?', [result.insertId]);
      return offers[0];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find all vehicle offers with optional filtering
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} List of vehicle offers
   */
  static async findAll(filters = {}) {
    let query = `
      SELECT 
        vo.*,
        v.license_plate,
        v.owner_name,
        v.phone_number,
        o.name as offer_name,
        o.description as offer_description,
        o.discount_type,
        o.discount_value,
        o.visit_threshold,
        earned_cr.regno as earned_on_vehicle_regno,
        used_cr.regno as used_on_vehicle_regno
      FROM vehicle_offers vo
      LEFT JOIN vehicles v ON vo.vehicle_id = v.id
      LEFT JOIN offers o ON vo.offer_id = o.id
      LEFT JOIN car_registry earned_cr ON vo.earned_on_visit_id = earned_cr.id
      LEFT JOIN car_registry used_cr ON vo.used_on_visit_id = used_cr.id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 0;

    if (filters.vehicle_id) {
      paramCount++;
      query += ` AND vo.vehicle_id = ?`;
      values.push(filters.vehicle_id);
    }

    if (filters.offer_id) {
      paramCount++;
      query += ` AND vo.offer_id = ?`;
      values.push(filters.offer_id);
    }

    if (filters.status) {
      paramCount++;
      query += ` AND vo.status = ?`;
      values.push(filters.status);
    }

    if (filters.license_plate) {
      paramCount++;
      query += ` AND v.license_plate LIKE ?`;
      values.push(`%${filters.license_plate}%`);
    }

    if (filters.owner_name) {
      paramCount++;
      query += ` AND v.owner_name LIKE ?`;
      values.push(`%${filters.owner_name}%`);
    }

    if (filters.start_date) {
      paramCount++;
      query += ` AND vo.issued_date >= ?`;
      values.push(filters.start_date);
    }

    if (filters.end_date) {
      paramCount++;
      query += ` AND vo.issued_date <= ?`;
      values.push(filters.end_date);
    }

    if (filters.is_active === 'true') {
      query += ` AND vo.status = 'active'`;
    }

    if (filters.is_used === 'true') {
      query += ` AND vo.status = 'used'`;
    }

    if (filters.is_expired === 'true') {
      query += ` AND vo.status = 'expired'`;
    }

    // Sorting
    if (filters.sort_by) {
      const sortOrder = filters.sort_order === 'asc' ? 'ASC' : 'DESC';
      const validSortFields = ['issued_date', 'used_date', 'status'];
      
      if (validSortFields.includes(filters.sort_by)) {
        query += ` ORDER BY vo.${filters.sort_by} ${sortOrder}`;
      } else {
        query += ` ORDER BY vo.issued_date DESC`;
      }
    } else {
      query += ` ORDER BY vo.issued_date DESC`;
    }

    try {
      const [offers] = await db.execute(query, values);
      return offers;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find vehicle offer by ID
   * @param {number} id - Vehicle offer ID
   * @returns {Promise<Object>} Vehicle offer data
   */
  static async findById(id) {
    const query = `
      SELECT 
        vo.*,
        v.license_plate,
        v.owner_name,
        v.phone_number,
        v.email,
        v.make,
        v.model,
        o.name as offer_name,
        o.description as offer_description,
        o.discount_type,
        o.discount_value,
        o.visit_threshold,
        o.valid_from,
        o.valid_until,
        earned_cr.regno as earned_on_vehicle_regno,
        earned_cr.service as earned_on_service,
        earned_cr.amount as earned_on_amount,
        used_cr.regno as used_on_vehicle_regno,
        used_cr.service as used_on_service,
        used_cr.amount as used_on_amount
      FROM vehicle_offers vo
      LEFT JOIN vehicles v ON vo.vehicle_id = v.id
      LEFT JOIN offers o ON vo.offer_id = o.id
      LEFT JOIN car_registry earned_cr ON vo.earned_on_visit_id = earned_cr.id
      LEFT JOIN car_registry used_cr ON vo.used_on_visit_id = used_cr.id
      WHERE vo.id = ?
    `;
    
    try {
      const [offers] = await db.execute(query, [id]);
      return offers[0] || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find active offers for a vehicle
   * @param {number} vehicleId - Vehicle ID
   * @returns {Promise<Array>} Active vehicle offers
   */
  static async findActiveByVehicleId(vehicleId) {
    const query = `
      SELECT 
        vo.*,
        o.name as offer_name,
        o.description as offer_description,
        o.discount_type,
        o.discount_value,
        o.visit_threshold
      FROM vehicle_offers vo
      LEFT JOIN offers o ON vo.offer_id = o.id
      WHERE vo.vehicle_id = ? AND vo.status = 'active'
      ORDER BY vo.issued_date DESC
    `;
    
    try {
      const [offers] = await db.execute(query, [vehicleId]);
      return offers;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find offers by license plate
   * @param {string} licensePlate - License plate
   * @param {string} status - Optional status filter
   * @returns {Promise<Array>} Vehicle offers
   */
  static async findByLicensePlate(licensePlate, status = null) {
    let query = `
      SELECT 
        vo.*,
        v.license_plate,
        v.owner_name,
        v.phone_number,
        o.name as offer_name,
        o.description as offer_description,
        o.discount_type,
        o.discount_value,
        o.visit_threshold
      FROM vehicle_offers vo
      LEFT JOIN vehicles v ON vo.vehicle_id = v.id
      LEFT JOIN offers o ON vo.offer_id = o.id
      WHERE v.license_plate = ?
    `;
    
    const values = [licensePlate.toUpperCase()];

    if (status) {
      query += ` AND vo.status = ?`;
      values.push(status);
    }

    query += ` ORDER BY vo.issued_date DESC`;

    try {
      const [offers] = await db.execute(query, values);
      return offers;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark vehicle offer as used
   * @param {number} id - Vehicle offer ID
   * @param {number} usedOnVisitId - Visit ID where offer was used
   * @param {string} notes - Optional notes
   * @returns {Promise<Object>} Updated vehicle offer
   */
  static async markAsUsed(id, usedOnVisitId, notes = null) {
    const query = `
      UPDATE vehicle_offers 
      SET status = 'used', used_date = CURRENT_TIMESTAMP, used_on_visit_id = ?, notes = ?
      WHERE id = ? AND status = 'active'
    `;
    
    try {
      const [result] = await db.execute(query, [usedOnVisitId, notes, id]);
      if (result.affectedRows === 0) {
        throw new Error('Vehicle offer not found or not active');
      }
      return await this.findById(id);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark vehicle offer as expired
   * @param {number} id - Vehicle offer ID
   * @param {string} notes - Optional notes
   * @returns {Promise<Object>} Updated vehicle offer
   */
  static async markAsExpired(id, notes = null) {
    const query = `
      UPDATE vehicle_offers 
      SET status = 'expired', notes = ?
      WHERE id = ? AND status = 'active'
    `;
    
    try {
      const [result] = await db.execute(query, [notes, id]);
      if (result.affectedRows === 0) {
        throw new Error('Vehicle offer not found or not active');
      }
      return await this.findById(id);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update vehicle offer information
   * @param {number} id - Vehicle offer ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated vehicle offer
   */
  static async update(id, updateData) {
    const {
      vehicle_id,
      offer_id,
      earned_on_visit_id,
      issued_date,
      used_date,
      used_on_visit_id,
      status,
      notes
    } = updateData;

    const query = `
      UPDATE vehicle_offers 
      SET 
        ${vehicle_id !== undefined ? 'vehicle_id = ?,' : ''}
        ${offer_id !== undefined ? 'offer_id = ?,' : ''}
        ${earned_on_visit_id !== undefined ? 'earned_on_visit_id = ?,' : ''}
        ${issued_date !== undefined ? 'issued_date = ?,' : ''}
        ${used_date !== undefined ? 'used_date = ?,' : ''}
        ${used_on_visit_id !== undefined ? 'used_on_visit_id = ?,' : ''}
        ${status !== undefined ? 'status = ?,' : ''}
        ${notes !== undefined ? 'notes = ?,' : ''}
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    // Remove trailing comma
    const cleanQuery = query.replace(/,\s+WHERE/, ' WHERE');
    
    const values = [];
    if (vehicle_id !== undefined) values.push(vehicle_id);
    if (offer_id !== undefined) values.push(offer_id);
    if (earned_on_visit_id !== undefined) values.push(earned_on_visit_id);
    if (issued_date !== undefined) values.push(issued_date);
    if (used_date !== undefined) values.push(used_date);
    if (used_on_visit_id !== undefined) values.push(used_on_visit_id);
    if (status !== undefined) values.push(status);
    if (notes !== undefined) values.push(notes);
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
   * Delete a vehicle offer record
   * @param {number} id - Vehicle offer ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    const query = 'DELETE FROM vehicle_offers WHERE id = ?';
    
    try {
      const [result] = await db.execute(query, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if vehicle already has an active offer of the same type
   * @param {number} vehicleId - Vehicle ID
   * @param {number} offerId - Offer ID
   * @returns {Promise<boolean>} Exists status
   */
  static async hasActiveOffer(vehicleId, offerId) {
    const query = `
      SELECT COUNT(*) as count 
      FROM vehicle_offers 
      WHERE vehicle_id = ? AND offer_id = ? AND status = 'active'
    `;
    
    try {
      const [result] = await db.execute(query, [vehicleId, offerId]);
      return parseInt(result[0].count) > 0;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get vehicle offer statistics
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} Vehicle offer statistics
   */
  static async getStatistics(filters = {}) {
    let query = `
      SELECT 
        COUNT(*) as total_offers,
        COUNT(*) FILTER (WHERE status = 'active') as active_offers,
        COUNT(*) FILTER (WHERE status = 'used') as used_offers,
        COUNT(*) FILTER (WHERE status = 'expired') as expired_offers,
        o.discount_type,
        COUNT(*) as type_count,
        COUNT(*) FILTER (WHERE status = 'used') as type_used
      FROM vehicle_offers vo
      LEFT JOIN offers o ON vo.offer_id = o.id
      WHERE 1=1
    `;
    
    const values = [];
    let paramCount = 0;

    if (filters.start_date && filters.end_date) {
      paramCount += 2;
      query += ` AND vo.issued_date BETWEEN ? AND ?`;
      values.push(filters.start_date, filters.end_date);
    }

    query += ' GROUP BY o.discount_type';

    try {
      const [stats] = await db.execute(query, values);
      
      const result = {
        total_offers: 0,
        active_offers: 0,
        used_offers: 0,
        expired_offers: 0,
        type_breakdown: stats
      };

      if (stats.length > 0) {
        const totalQuery = `
          SELECT 
            COUNT(*) as total_offers,
            COUNT(*) FILTER (WHERE status = 'active') as active_offers,
            COUNT(*) FILTER (WHERE status = 'used') as used_offers,
            COUNT(*) FILTER (WHERE status = 'expired') as expired_offers
          FROM vehicle_offers
          WHERE 1=1
          ${filters.start_date && filters.end_date ? 'AND issued_date BETWEEN ? AND ?' : ''}
        `;
        
        const totalResult = await db.execute(totalQuery, values);
        
        if (totalResult[0].length > 0) {
          result.total_offers = parseInt(totalResult[0][0].total_offers);
          result.active_offers = parseInt(totalResult[0][0].active_offers);
          result.used_offers = parseInt(totalResult[0][0].used_offers);
          result.expired_offers = parseInt(totalResult[0][0].expired_offers);
        }
      }

      return result;
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
      SELECT 
        vo.*,
        v.license_plate,
        v.owner_name,
        o.name as offer_name,
        o.valid_until
      FROM vehicle_offers vo
      LEFT JOIN vehicles v ON vo.vehicle_id = v.id
      LEFT JOIN offers o ON vo.offer_id = o.id
      WHERE vo.status = 'active'
        AND o.valid_until IS NOT NULL
        AND o.valid_until <= DATE_ADD(CURRENT_DATE, INTERVAL ? DAY)
        AND o.valid_until >= CURRENT_DATE
      ORDER BY o.valid_until ASC
    `;
    
    try {
      const [offers] = await db.execute(query, [days]);
      return offers;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Bulk expire offers that have passed their validity date
   * @returns {Promise<number>} Number of offers expired
   */
  static async expireOffers() {
    const query = `
      UPDATE vehicle_offers vo
      LEFT JOIN offers o ON vo.offer_id = o.id
      SET vo.status = 'expired', vo.notes = CONCAT('Auto-expired: Offer validity ended on ', o.valid_until)
      WHERE vo.status = 'active'
        AND o.valid_until IS NOT NULL
        AND o.valid_until < CURRENT_DATE
    `;
    
    try {
      const [result] = await db.execute(query);
      return result.affectedRows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = VehicleOffer;