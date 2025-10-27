const { db } = require('../config/db');

/**
 * Vehicle Statistics model for tracking vehicle visit patterns and offers
 */
class VehicleStats {
  /**
   * Create or update vehicle statistics for a new visit
   * @param {number} vehicleId - Vehicle ID
   * @returns {Promise<Object>} Updated statistics
   */
  static async recordVisit(vehicleId) {
    try {
      // First, ensure the vehicle exists
      const vehicleQuery = 'SELECT id FROM vehicles WHERE id = ?';
      const [vehicles] = await db.execute(vehicleQuery, [vehicleId]);
      
      if (vehicles.length === 0) {
        throw new Error('Vehicle not found');
      }

      const query = `
        INSERT INTO vehicle_stats (vehicle_id, total_visits, current_visit_count, last_visit_date)
        VALUES (?, 1, 1, CURRENT_TIMESTAMP)
        ON CONFLICT (vehicle_id) 
        DO UPDATE SET 
          total_visits = vehicle_stats.total_visits + 1,
          current_visit_count = vehicle_stats.current_visit_count + 1,
          last_visit_date = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      `;

      // For MySQL, we use ON DUPLICATE KEY UPDATE instead of ON CONFLICT
      const mysqlQuery = `
        INSERT INTO vehicle_stats (vehicle_id, total_visits, current_visit_count, last_visit_date)
        VALUES (?, 1, 1, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE 
          total_visits = total_visits + 1,
          current_visit_count = current_visit_count + 1,
          last_visit_date = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      `;

      const [result] = await db.execute(mysqlQuery, [vehicleId]);
      
      // Return the updated statistics
      return await this.findByVehicleId(vehicleId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find vehicle statistics by vehicle ID
   * @param {number} vehicleId - Vehicle ID
   * @returns {Promise<Object>} Vehicle statistics
   */
  static async findByVehicleId(vehicleId) {
    const query = `
      SELECT vs.*, v.license_plate, v.owner_name
      FROM vehicle_stats vs
      LEFT JOIN vehicles v ON vs.vehicle_id = v.id
      WHERE vs.vehicle_id = ?
    `;
    
    try {
      const [stats] = await db.execute(query, [vehicleId]);
      return stats[0] || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find vehicle statistics by license plate
   * @param {string} licensePlate - License plate
   * @returns {Promise<Object>} Vehicle statistics
   */
  static async findByLicensePlate(licensePlate) {
    const query = `
      SELECT vs.*, v.license_plate, v.owner_name, v.phone_number
      FROM vehicle_stats vs
      LEFT JOIN vehicles v ON vs.vehicle_id = v.id
      WHERE v.license_plate = ?
    `;
    
    try {
      const [stats] = await db.execute(query, [licensePlate.toUpperCase()]);
      return stats[0] || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reset current visit count after offer utilization
   * @param {number} vehicleId - Vehicle ID
   * @returns {Promise<Object>} Updated statistics
   */
  static async resetVisitCount(vehicleId) {
    const query = `
      UPDATE vehicle_stats 
      SET current_visit_count = 0, updated_at = CURRENT_TIMESTAMP
      WHERE vehicle_id = ?
    `;
    
    try {
      const [result] = await db.execute(query, [vehicleId]);
      if (result.affectedRows === 0) {
        throw new Error('Vehicle statistics not found');
      }
      return await this.findByVehicleId(vehicleId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Increment offers earned count
   * @param {number} vehicleId - Vehicle ID
   * @returns {Promise<Object>} Updated statistics
   */
  static async incrementOffersEarned(vehicleId) {
    const query = `
      UPDATE vehicle_stats 
      SET total_offers_earned = total_offers_earned + 1, updated_at = CURRENT_TIMESTAMP
      WHERE vehicle_id = ?
    `;
    
    try {
      const [result] = await db.execute(query, [vehicleId]);
      if (result.affectedRows === 0) {
        // Create stats record if it doesn't exist
        await this.recordVisit(vehicleId);
        return await this.incrementOffersEarned(vehicleId);
      }
      return await this.findByVehicleId(vehicleId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Increment offers used count
   * @param {number} vehicleId - Vehicle ID
   * @returns {Promise<Object>} Updated statistics
   */
  static async incrementOffersUsed(vehicleId) {
    const query = `
      UPDATE vehicle_stats 
      SET total_offers_used = total_offers_used + 1, updated_at = CURRENT_TIMESTAMP
      WHERE vehicle_id = ?
    `;
    
    try {
      const [result] = await db.execute(query, [vehicleId]);
      if (result.affectedRows === 0) {
        // Create stats record if it doesn't exist
        await this.recordVisit(vehicleId);
        return await this.incrementOffersUsed(vehicleId);
      }
      return await this.findByVehicleId(vehicleId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all vehicle statistics with optional filtering
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} List of vehicle statistics
   */
  static async findAll(filters = {}) {
    let query = `
      SELECT vs.*, v.license_plate, v.owner_name, v.phone_number, v.make, v.model
      FROM vehicle_stats vs
      LEFT JOIN vehicles v ON vs.vehicle_id = v.id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 0;

    if (filters.min_visits) {
      paramCount++;
      query += ` AND vs.total_visits >= ?`;
      values.push(parseInt(filters.min_visits));
    }

    if (filters.min_current_visits) {
      paramCount++;
      query += ` AND vs.current_visit_count >= ?`;
      values.push(parseInt(filters.min_current_visits));
    }

    if (filters.has_offers_earned === 'true') {
      query += ` AND vs.total_offers_earned > 0`;
    }

    if (filters.has_offers_used === 'true') {
      query += ` AND vs.total_offers_used > 0`;
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

    // Sorting
    if (filters.sort_by) {
      const sortOrder = filters.sort_order === 'asc' ? 'ASC' : 'DESC';
      const validSortFields = ['total_visits', 'current_visit_count', 'last_visit_date', 'total_offers_earned', 'total_offers_used'];
      
      if (validSortFields.includes(filters.sort_by)) {
        query += ` ORDER BY vs.${filters.sort_by} ${sortOrder}`;
      } else {
        query += ` ORDER BY vs.total_visits DESC`;
      }
    } else {
      query += ` ORDER BY vs.total_visits DESC`;
    }

    try {
      const [stats] = await db.execute(query, values);
      return stats;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get top vehicles by visit count
   * @param {number} limit - Number of vehicles to return
   * @returns {Promise<Array>} Top vehicles
   */
  static async getTopVehiclesByVisits(limit = 10) {
    const query = `
      SELECT vs.*, v.license_plate, v.owner_name, v.phone_number, v.make, v.model
      FROM vehicle_stats vs
      LEFT JOIN vehicles v ON vs.vehicle_id = v.id
      ORDER BY vs.total_visits DESC
      LIMIT ?
    `;
    
    try {
      const [vehicles] = await db.execute(query, [limit]);
      return vehicles;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get vehicles eligible for offers based on current visit count
   * @param {number} visitThreshold - Visit threshold for offers
   * @returns {Promise<Array>} Eligible vehicles
   */
  static async getVehiclesEligibleForOffers(visitThreshold = 5) {
    const query = `
      SELECT vs.*, v.license_plate, v.owner_name, v.phone_number, v.make, v.model
      FROM vehicle_stats vs
      LEFT JOIN vehicles v ON vs.vehicle_id = v.id
      WHERE vs.current_visit_count >= ?
      ORDER BY vs.current_visit_count DESC
    `;
    
    try {
      const [vehicles] = await db.execute(query, [visitThreshold]);
      return vehicles;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get vehicles near offer threshold
   * @param {number} threshold - Offer threshold
   * @param {number} buffer - Buffer for "near" calculation
   * @returns {Promise<Array>} Vehicles near threshold
   */
  static async getVehiclesNearOfferThreshold(threshold = 5, buffer = 2) {
    const minVisits = Math.max(1, threshold - buffer);
    const query = `
      SELECT vs.*, v.license_plate, v.owner_name, v.phone_number, v.make, v.model
      FROM vehicle_stats vs
      LEFT JOIN vehicles v ON vs.vehicle_id = v.id
      WHERE vs.current_visit_count BETWEEN ? AND ?
        AND vs.current_visit_count < ?
      ORDER BY vs.current_visit_count DESC
    `;
    
    try {
      const [vehicles] = await db.execute(query, [minVisits, threshold - 1, threshold]);
      return vehicles;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get vehicle statistics overview
   * @returns {Promise<Object>} Overall statistics
   */
  static async getOverview() {
    const query = `
      SELECT 
        COUNT(*) as total_vehicles_tracked,
        COALESCE(SUM(total_visits), 0) as total_visits,
        COALESCE(AVG(total_visits), 0) as average_visits_per_vehicle,
        COALESCE(SUM(total_offers_earned), 0) as total_offers_earned,
        COALESCE(SUM(total_offers_used), 0) as total_offers_used,
        COUNT(*) FILTER (WHERE current_visit_count >= 5) as vehicles_near_offer,
        COUNT(*) FILTER (WHERE current_visit_count >= 10) as vehicles_ready_for_offer,
        COUNT(*) FILTER (WHERE last_visit_date >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 30 DAY)) as active_vehicles_30_days,
        COUNT(*) FILTER (WHERE last_visit_date >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 7 DAY)) as active_vehicles_7_days
      FROM vehicle_stats
    `;
    
    try {
      const [stats] = await db.execute(query);
      return stats[0] || {};
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get visit trends over time
   * @param {number} days - Number of days to analyze
   * @returns {Promise<Array>} Visit trends
   */
  static async getVisitTrends(days = 30) {
    const query = `
      SELECT 
        DATE(cr.updated_at) as visit_date,
        COUNT(*) as daily_visits,
        COUNT(DISTINCT cr.regno) as unique_vehicles
      FROM car_registry cr
      WHERE cr.updated_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? DAY)
      GROUP BY DATE(cr.updated_at)
      ORDER BY visit_date DESC
    `;
    
    try {
      const [trends] = await db.execute(query, [days]);
      return trends;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get vehicles with most offers earned
   * @param {number} limit - Number of vehicles to return
   * @returns {Promise<Array>} Vehicles with most offers
   */
  static async getVehiclesWithMostOffers(limit = 10) {
    const query = `
      SELECT vs.*, v.license_plate, v.owner_name, v.phone_number, v.make, v.model
      FROM vehicle_stats vs
      LEFT JOIN vehicles v ON vs.vehicle_id = v.id
      ORDER BY vs.total_offers_earned DESC, vs.total_offers_used DESC
      LIMIT ?
    `;
    
    try {
      const [vehicles] = await db.execute(query, [limit]);
      return vehicles;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update vehicle statistics manually (admin function)
   * @param {number} vehicleId - Vehicle ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated statistics
   */
  static async updateStats(vehicleId, updateData) {
    const { total_visits, current_visit_count, total_offers_earned, total_offers_used } = updateData;

    const query = `
      UPDATE vehicle_stats 
      SET 
        ${total_visits !== undefined ? 'total_visits = ?,' : ''}
        ${current_visit_count !== undefined ? 'current_visit_count = ?,' : ''}
        ${total_offers_earned !== undefined ? 'total_offers_earned = ?,' : ''}
        ${total_offers_used !== undefined ? 'total_offers_used = ?,' : ''}
        updated_at = CURRENT_TIMESTAMP
      WHERE vehicle_id = ?
    `;
    
    // Remove trailing comma
    const cleanQuery = query.replace(/,\s+WHERE/, ' WHERE');
    
    const values = [];
    if (total_visits !== undefined) values.push(parseInt(total_visits));
    if (current_visit_count !== undefined) values.push(parseInt(current_visit_count));
    if (total_offers_earned !== undefined) values.push(parseInt(total_offers_earned));
    if (total_offers_used !== undefined) values.push(parseInt(total_offers_used));
    values.push(vehicleId);

    try {
      const [result] = await db.execute(cleanQuery, values);
      if (result.affectedRows === 0) {
        throw new Error('Vehicle statistics not found');
      }
      return await this.findByVehicleId(vehicleId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Initialize statistics for a vehicle (if not exists)
   * @param {number} vehicleId - Vehicle ID
   * @returns {Promise<Object>} Vehicle statistics
   */
  static async initializeStats(vehicleId) {
    try {
      // Check if stats already exist
      const existingStats = await this.findByVehicleId(vehicleId);
      if (existingStats) {
        return existingStats;
      }

      // Create initial stats record
      const query = `
        INSERT INTO vehicle_stats (vehicle_id, total_visits, current_visit_count)
        VALUES (?, 0, 0)
      `;
      
      await db.execute(query, [vehicleId]);
      return await this.findByVehicleId(vehicleId);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = VehicleStats;