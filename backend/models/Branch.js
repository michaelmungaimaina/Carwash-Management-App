const { db } = require('../config/db');

/**
 * Branch model for managing car wash branches
 * ID Format: BRN001, BRN002, BRN003, etc.
 */
class Branch {
  /**
   * Generate the next branch ID in format BRN001, BRN002, etc.
   * @returns {Promise<string>} Generated branch ID
   */
  static async generateNextId() {
    try {
      // Get the highest existing branch ID
      const query = 'SELECT id FROM branches WHERE id LIKE "BRN%" ORDER BY id DESC LIMIT 1';
      const [rows] = await db.execute(query);

      if (rows.length === 0) {
        return 'BRN001'; // First branch
      }

      const lastId = rows[0].id;
      const lastNumber = parseInt(lastId.replace('BRN', ''));
      const nextNumber = lastNumber + 1;

      // Format as BRN with 3-digit number
      return `BRN${nextNumber.toString().padStart(3, '0')}`;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Validate branch ID format
   * @param {string} id - Branch ID to validate
   * @returns {boolean} Validation result
   */
  static isValidId(id) {
    const regex = /^BRN\d{3}$/;
    return regex.test(id);
  }

  /**
   * Create a new branch
   * @param {Object} branchData - Branch data
   * @returns {Promise<Object>} Created branch
   */
  static async create(branchData) {
    const { name, location } = branchData;

    // Validate required fields
    if (!name) {
      throw new Error('Branch name is required');
    }
    if (!location) {
      throw new Error('Location name is required');
    }

    // Check if branch name or location already exists
    const checkQuery = `
    SELECT * FROM branches
    WHERE name = ? OR location = ?
    LIMIT 1
  `;
    const [existing] = await db.execute(checkQuery, [name, location]);

    if (existing.length > 0) {
      const existingBranch = existing[0];
      if (existingBranch.name === name && existingBranch.location === location) {
        throw new Error(`A branch named "${name}" already exists at location "${location}".`);
      } else if (existingBranch.name === name) {
        throw new Error(`A branch named "${name}" already exists.`);
      } else if (existingBranch.location === location) {
        throw new Error(`A branch already exists in location "${location}".`);
      }
    }
    // Generate branch ID
    const id = await this.generateNextId();

    const query = `
      INSERT INTO branches (id, name, location)
      VALUES (?, ?, ?)
    `;

    const values = [id, name, location || null];

    try {
      const [result] = await db.execute(query, values);
      return await this.findById(id);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find all branches with optional filtering
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} List of branches
   */
  static async findAll(filters = {}) {
    let query = 'SELECT * FROM branches WHERE 1=1';
    const values = [];
    let paramCount = 0;

    if (filters.name) {
      paramCount++;
      query += ` AND name LIKE ?`;
      values.push(`%${filters.name}%`);
    }

    if (filters.location) {
      paramCount++;
      query += ` AND location LIKE ?`;
      values.push(`%${filters.location}%`);
    }

    query += ' ORDER BY created_at DESC';

    try {
      const [branches] = await db.execute(query, values);
      return branches;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find branch by ID
   * @param {string} id - Branch ID (BRN001 format)
   * @returns {Promise<Object>} Branch data
   */
  static async findById(id) {
    // Validate ID format
    if (!this.isValidId(id)) {
      throw new Error('Invalid branch ID format. Expected BRN001 format');
    }

    const query = 'SELECT * FROM branches WHERE id = ?';

    try {
      const [branches] = await db.execute(query, [id]);
      return branches[0] || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find branch by name
   * @param {string} name - Branch name
   * @returns {Promise<Object>} Branch data
   */
  static async findByName(name) {
    const query = 'SELECT * FROM branches WHERE name = ?';

    try {
      const [branches] = await db.execute(query, [name]);
      return branches[0] || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update branch information
   * @param {string} id - Branch ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated branch
   */
  static async update(id, updateData) {
    const { name, location } = updateData;

    // Validate ID format
    if (!this.isValidId(id)) {
      throw new Error('Invalid branch ID format. Expected BRN001 format');
    }

    const query = `
      UPDATE branches 
      SET name = ?, location = ?
      WHERE id = ?
    `;

    const values = [name, location || null, id];

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
   * Delete a branch
   * @param {string} id - Branch ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    // Validate ID format
    if (!this.isValidId(id)) {
      throw new Error('Invalid branch ID format. Expected BRN001 format');
    }

    const query = 'DELETE FROM branches WHERE id = ?';

    try {
      const [result] = await db.execute(query, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Search branches by name or location
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Matching branches
   */
  static async search(searchTerm) {
    const query = `
      SELECT * FROM branches 
      WHERE name LIKE ? OR location LIKE ?
      ORDER BY name
    `;

    try {
      const [branches] = await db.execute(query, [
        `%${searchTerm}%`,
        `%${searchTerm}%`
      ]);
      return branches;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get branch statistics
   * @param {string} branchId - Branch ID
   * @returns {Promise<Object>} Branch statistics
   */
  static async getStatistics(branchId) {
    // Validate ID format
    if (!this.isValidId(branchId)) {
      throw new Error('Invalid branch ID format. Expected BRN001 format');
    }

    const queries = {
      totalUsers: 'SELECT COUNT(*) as count FROM users WHERE branch_id = ?',
      totalCars: 'SELECT COUNT(*) as count FROM car_registry WHERE branch_id = ?',
      totalCarpets: 'SELECT COUNT(*) as count FROM carpet_registry WHERE branch_id = ?',
      totalPayments: `
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM payments 
        WHERE source_id IN (
          SELECT id FROM car_registry WHERE branch_id = ? 
          UNION 
          SELECT id FROM carpet_registry WHERE branch_id = ?
        )
      `,
      todayServices: `
        SELECT COUNT(*) as count 
        FROM car_registry 
        WHERE branch_id = ? 
        AND DATE(id) = CURDATE()
      `,
      activeAttendants: `
        SELECT COUNT(DISTINCT attendant_id) as count 
        FROM attendant_service 
        WHERE car_id IN (SELECT id FROM car_registry WHERE branch_id = ?)
        AND DATE(id) = CURDATE()
      `
    };

    const stats = {};

    try {
      for (const [key, query] of Object.entries(queries)) {
        const [result] = await db.execute(query, [branchId, branchId]);

        if (key === 'totalPayments') {
          stats[key] = parseFloat(result[0].total);
        } else {
          stats[key] = parseInt(result[0].count);
        }
      }

      return stats;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all branches with basic statistics
   * @returns {Promise<Array>} Branches with statistics
   */
  static async getAllWithStats() {
    const query = `
      SELECT 
        b.*,
        (SELECT COUNT(*) FROM users u WHERE u.branch_id = b.id) as user_count,
        (SELECT COUNT(*) FROM car_registry cr WHERE cr.branch_id = b.id) as car_service_count,
        (SELECT COUNT(*) FROM carpet_registry carr WHERE carr.branch_id = b.id) as carpet_service_count,
        (
          SELECT COALESCE(SUM(amount), 0) 
          FROM payments p 
          WHERE p.source_id IN (
            SELECT id FROM car_registry WHERE branch_id = b.id
            UNION 
            SELECT id FROM carpet_registry WHERE branch_id = b.id
          )
        ) as total_revenue
      FROM branches b
      ORDER BY b.created_at DESC
    `;

    try {
      const [branches] = await db.execute(query);
      return branches;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if branch name already exists (for validation)
   * @param {string} name - Branch name to check
   * @param {string} excludeId - Branch ID to exclude (for updates)
   * @returns {Promise<boolean>} Exists status
   */
  static async nameExists(name, excludeId = null) {
    let query = 'SELECT COUNT(*) as count FROM branches WHERE name = ?';
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
}

module.exports = Branch;