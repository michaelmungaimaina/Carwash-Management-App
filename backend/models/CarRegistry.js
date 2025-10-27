const { db } = require('../config/db');

/**
 * Car Registry model for managing car wash services (MySQL Version)
 * ID Format: yyyddmmhhMMsss (e.g., 231215143045123)
 */
class CarRegistry {
  /**
   * Generate custom ID in format: yyyyddmmhhMMsss
   * @returns {string} Generated ID
   */
  static generateId() {
  const now = new Date();
  const year = now.getFullYear().toString(); // YYYY (4)
  const month = (now.getMonth() + 1).toString().padStart(2, '0'); // MM (2)
  const day = now.getDate().toString().padStart(2, '0'); // DD (2)
  const hours = now.getHours().toString().padStart(2, '0'); // hh (2)
  const minutes = now.getMinutes().toString().padStart(2, '0'); // mm (2)
  const seconds = now.getSeconds().toString().padStart(2, '0'); // ss (2)
  const millis = Math.floor(now.getMilliseconds() / 10).toString().padStart(3, '0'); // sss (3 but effectively 0–99)

  return `${year}${month}${day}${hours}${minutes}${seconds}${millis}`.slice(0, 15);
}

  /**
   * Parse ID to get date information
   * @param {string} id - Car registry ID in yyyddmmhhMMsss format
   * @returns {Object} Parsed date components
   */
  static parseId(id) {
    if (id.length !== 15) {
      throw new Error('Invalid ID format. Expected yyyddmmhhMMsss');
    }

    const year = id.substring(0, 2); // YY -> YYYY
    const day = id.substring(2, 4); // DD
    const month = id.substring(4, 6); // MM
    const hours = id.substring(6, 8); // HH
    const minutes = id.substring(8, 10); // MM
    const seconds = id.substring(10, 12); // SS
    const milliseconds = id.substring(12, 15); // SSS

    return {
      year: parseInt(year),
      month: parseInt(month),
      day: parseInt(day),
      hours: parseInt(hours),
      minutes: parseInt(minutes),
      seconds: parseInt(seconds),
      milliseconds: parseInt(milliseconds),
      date: new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}Z`)
    };
  }

  /**
   * Register a new car service
   * @param {Object} carData - Car service data
   * @returns {Promise<Object>} Registered car service
   */
  static async create(carData) {
    const {
      regno, model, service, amount, registered_by, tip_amount,
      excess_amount, branch_id
    } = carData;

    const id = this.generateId();
    const query = `
      INSERT INTO car_registry (id, regno, model, service, amount, registered_by, 
                               tip_amount, excess_amount, branch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      id, regno, model, service, amount, registered_by,
      tip_amount, excess_amount, branch_id
    ];

    try {
      const [result] = await db.execute(query, values);
      return await this.findById(id);
    } catch (error) {
      throw error;
    }
  }

  /**
   * 
   * @param {*} regno 
   * @param {*} datePrefix 
   * @returns 
   */
  static async findByRegnoAndDate(regno, datePrefix) {
  try {
    // The ID format is yyyymmddHHMMsss
    // So we can check where id starts with the date prefix
    const [rows] = await db.query(
      `SELECT * FROM car_registry 
       WHERE regno = ? AND id LIKE CONCAT(?, '%') 
       ORDER BY id DESC 
       LIMIT 1`,
      [regno, datePrefix]
    );

    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error checking car by regno and date:', error.message);
    throw error;
  }
}


  /**
   * Find all car services with optional filtering
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} List of car services
   */
  static async findAll(filters = {}) {
    let query = `
      SELECT cr.*, u.name as registered_by_name, b.name as branch_name
      FROM car_registry cr
      LEFT JOIN users u ON cr.registered_by = u.id
      LEFT JOIN branches b ON cr.branch_id = b.id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 0;

    if (filters.branch_id) {
      paramCount++;
      query += ` AND cr.branch_id = ?`;
      values.push(filters.branch_id);
    }

    if (filters.regno) {
      paramCount++;
      query += ` AND cr.regno LIKE ?`;
      values.push(`%${filters.regno}%`);
    }

    if (filters.model) {
      paramCount++;
      query += ` AND cr.model = ?`;
      values.push(filters.model);
    }

    if (filters.service) {
      paramCount++;
      query += ` AND cr.service LIKE ?`;
      values.push(`%${filters.service}%`);
    }

    if (filters.payment_mode) {
      paramCount++;
      query += ` AND cr.id IN (
        SELECT source_id FROM payments 
        WHERE source = 'CARWASH' AND payment_mode = ?
      )`;
      values.push(filters.payment_mode);
    }

    if (filters.start_date && filters.end_date) {
      paramCount += 2;
      query += ` AND cr.updated_at BETWEEN ? AND ?`;
      values.push(filters.start_date, filters.end_date);
    }

    query += ' ORDER BY cr.updated_at DESC';

    try {
      const [cars] = await db.execute(query, values);
      return cars;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find car service by ID
   * @param {string} id - Car service ID (yyyddmmhhMMsss format)
   * @returns {Promise<Object>} Car service data
   */
  static async findById(id) {
    const query = `
      SELECT cr.*, u.name as registered_by_name, b.name as branch_name
      FROM car_registry cr
      LEFT JOIN users u ON cr.registered_by = u.id
      LEFT JOIN branches b ON cr.branch_id = b.id
      WHERE cr.id = ?
    `;
    
    try {
      const [cars] = await db.execute(query, [id]);
      return cars[0] || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find car services for a specific day using ID format
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<Array>} Car services for the day
   */
  static async findByDate(date) {
    // Extract year, month, day from date
    const dateObj = new Date(date);
    const year = dateObj.getFullYear().toString().slice(-2);
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    
    // ID format: yyyddmmhhMMsss - we need to match yyyddmm
    const datePattern = `${year}${day}${month}%`;
    
    const query = `
      SELECT cr.*, u.name as registered_by_name, b.name as branch_name
      FROM car_registry cr
      LEFT JOIN users u ON cr.registered_by = u.id
      LEFT JOIN branches b ON cr.branch_id = b.id
      WHERE cr.id LIKE ?
      ORDER BY cr.id DESC
    `;
    
    try {
      const [cars] = await db.execute(query, [datePattern]);
      return cars;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find car services with cash payments
   * @param {string} date - Optional date filter
   * @returns {Promise<Array>} Cash payment car services
   */
  static async findByCashPayment(date = null) {
    let query = `
      SELECT cr.*, u.name as registered_by_name, b.name as branch_name, p.amount as payment_amount
      FROM car_registry cr
      LEFT JOIN users u ON cr.registered_by = u.id
      LEFT JOIN branches b ON cr.branch_id = b.id
      LEFT JOIN payments p ON cr.id = p.source_id AND p.source = 'CARWASH'
      WHERE p.payment_mode = 'CASH'
    `;
    
    const values = [];
    
    if (date) {
      // Use ID pattern matching for date
      const dateObj = new Date(date);
      const year = dateObj.getFullYear().toString().slice(-2);
      const day = dateObj.getDate().toString().padStart(2, '0');
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const datePattern = `${year}${day}${month}%`;
      
      query += ` AND cr.id LIKE ?`;
      values.push(datePattern);
    }
    
    query += ' ORDER BY cr.updated_at DESC';
    
    try {
      const [cars] = await db.execute(query, values);
      return cars;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find car services with specific payment mode
   * @param {string} paymentMode - Payment mode (CASH, MPESA, CARD, BOTH)
   * @param {string} date - Optional date filter
   * @returns {Promise<Array>} Car services with specified payment mode
   */
  static async findByPaymentMode(paymentMode, date = null) {
    let query = `
      SELECT cr.*, u.name as registered_by_name, b.name as branch_name, p.amount as payment_amount
      FROM car_registry cr
      LEFT JOIN users u ON cr.registered_by = u.id
      LEFT JOIN branches b ON cr.branch_id = b.id
      LEFT JOIN payments p ON cr.id = p.source_id AND p.source = 'CARWASH'
      WHERE p.payment_mode = ?
    `;
    
    const values = [paymentMode];
    
    if (date) {
      const dateObj = new Date(date);
      const year = dateObj.getFullYear().toString().slice(-2);
      const day = dateObj.getDate().toString().padStart(2, '0');
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const datePattern = `${year}${day}${month}%`;
      
      query += ` AND cr.id LIKE ?`;
      values.push(datePattern);
    }
    
    query += ' ORDER BY cr.updated_at DESC';
    
    try {
      const [cars] = await db.execute(query, values);
      return cars;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update car service information
   * @param {string} id - Car service ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated car service
   */
  static async update(id, updateData) {
    const {
      regno, model, service, amount, tip_amount, excess_amount, branch_id
    } = updateData;

    const query = `
      UPDATE car_registry 
      SET regno = ?, model = ?, service = ?, amount = ?, 
          tip_amount = ?, excess_amount = ?, branch_id = ?,
          updated_at = UNIX_TIMESTAMP()
      WHERE id = ?
    `;
    
    const values = [
      regno, model, service, amount, tip_amount, excess_amount, branch_id, id
    ];

    try {
      const [result] = await db.execute(query, values);
      if (result.affectedRows === 0) {
        return null;
      }
      return await this.findById(id);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a car service record
   * @param {string} id - Car service ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    const query = 'DELETE FROM car_registry WHERE id = ?';
    
    try {
      const [result] = await db.execute(query, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get car service statistics
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} Service statistics
   */
  static async getStatistics(filters = {}) {
    let query = `
      SELECT 
        COUNT(*) as total_services,
        COALESCE(SUM(amount), 0) as total_revenue,
        COALESCE(SUM(tip_amount), 0) as total_tips,
        COALESCE(SUM(excess_amount), 0) as total_excess,
        COUNT(DISTINCT regno) as unique_cars,
        model,
        COUNT(*) as model_count
      FROM car_registry
      WHERE 1=1
    `;
    
    const values = [];
    let paramCount = 0;

    if (filters.branch_id) {
      paramCount++;
      query += ` AND branch_id = ?`;
      values.push(filters.branch_id);
    }

    if (filters.start_date && filters.end_date) {
      paramCount += 2;
      query += ` AND updated_at BETWEEN ? AND ?`;
      values.push(filters.start_date, filters.end_date);
    }

    query += ' GROUP BY model ORDER BY model_count DESC';

    try {
      const [stats] = await db.execute(query, values);
      
      const result = {
        total_services: 0,
        total_revenue: 0,
        total_tips: 0,
        total_excess: 0,
        unique_cars: 0,
        model_breakdown: stats
      };

      if (stats.length > 0) {
        // Calculate totals
        const totalQuery = `
          SELECT 
            COUNT(*) as total_services,
            COALESCE(SUM(amount), 0) as total_revenue,
            COALESCE(SUM(tip_amount), 0) as total_tips,
            COALESCE(SUM(excess_amount), 0) as total_excess,
            COUNT(DISTINCT regno) as unique_cars
          FROM car_registry
          WHERE 1=1
          ${filters.branch_id ? 'AND branch_id = ?' : ''}
          ${filters.start_date && filters.end_date ? 'AND updated_at BETWEEN ? AND ?' : ''}
        `;
        
        const totalValues = [];
        if (filters.branch_id) totalValues.push(filters.branch_id);
        if (filters.start_date && filters.end_date) {
          totalValues.push(filters.start_date, filters.end_date);
        }

        const [totalStats] = await db.execute(totalQuery, totalValues);
        
        if (totalStats.length > 0) {
          result.total_services = parseInt(totalStats[0].total_services);
          result.total_revenue = parseFloat(totalStats[0].total_revenue);
          result.total_tips = parseFloat(totalStats[0].total_tips);
          result.total_excess = parseFloat(totalStats[0].total_excess);
          result.unique_cars = parseInt(totalStats[0].unique_cars);
        }
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get daily car service report
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string} branchId - Branch ID
   * @returns {Promise<Array>} Daily report
   */
  static async getDailyReport(date, branchId = null) {
    // Use ID pattern matching for date
    const dateObj = new Date(date);
    const year = dateObj.getFullYear().toString().slice(-2);
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const datePattern = `${year}${day}${month}%`;
    
    let query = `
      SELECT 
        cr.*,
        u.name as attendant_name,
        p.amount as payment_amount,
        p.payment_mode,
        d.amount as discount_amount
      FROM car_registry cr
      LEFT JOIN users u ON cr.registered_by = u.id
      LEFT JOIN payments p ON p.source_id = cr.id AND p.source = 'CARWASH'
      LEFT JOIN discount d ON d.source_id = cr.id AND d.source = 'CARWASH'
      WHERE cr.id LIKE ?
    `;
    
    const values = [datePattern];

    if (branchId) {
      query += ` AND cr.branch_id = ?`;
      values.push(branchId);
    }

    query += ' ORDER BY cr.id DESC';

    try {
      const [report] = await db.execute(query, values);
      return report;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Parse ID and get readable date time
   * @param {string} id - Car registry ID
   * @returns {Object} Human readable date time
   */
  static getReadableDateTime(id) {
    try {
      const parsed = this.parseId(id);
      return {
        id: id,
        date: parsed.date.toISOString().split('T')[0],
        time: `${parsed.hours.toString().padStart(2, '0')}:${parsed.minutes.toString().padStart(2, '0')}:${parsed.seconds.toString().padStart(2, '0')}`,
        full_datetime: parsed.date.toLocaleString()
      };
    } catch (error) {
      return {
        id: id,
        date: 'Invalid ID',
        time: 'Invalid ID',
        full_datetime: 'Invalid ID'
      };
    }
  }
}

module.exports = CarRegistry;