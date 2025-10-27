const { db } = require('../config/db');

/**
 * Vehicle model for managing vehicle information
 */
class Vehicle {
  /**
   * Create a new vehicle record or update existing one
   * @param {Object} vehicleData - Vehicle data
   * @returns {Promise<Object>} Created or updated vehicle
   */
  static async createOrUpdate(vehicleData) {
    const { license_plate, make, model, owner_name, phone_number, email } = vehicleData;

    // Validate required fields
    if (!license_plate) {
      throw new Error('License plate is required');
    }

    // Check if vehicle already exists
    const existingVehicle = await this.findByLicensePlate(license_plate);
    
    if (existingVehicle) {
      // Update existing vehicle with new information (only non-null values)
      const updateData = {};
      if (make) updateData.make = make;
      if (model) updateData.model = model;
      
      // Only update owner info if provided (these can be updated later during payment)
      if (owner_name) updateData.owner_name = owner_name;
      if (phone_number) updateData.phone_number = phone_number;
      if (email) updateData.email = email;

      if (Object.keys(updateData).length > 0) {
        return await this.update(existingVehicle.id, updateData);
      }
      return existingVehicle;
    } else {
      // Create new vehicle
      const query = `
        INSERT INTO vehicles (license_plate, make, model, owner_name, phone_number, email)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      const values = [
        license_plate.toUpperCase(), // Normalize to uppercase
        make || null,
        model || null,
        owner_name || null,
        phone_number || null,
        email || null
      ];

      try {
        const [result] = await db.execute(query, values);
        const [vehicles] = await db.execute('SELECT * FROM vehicles WHERE id = ?', [result.insertId]);
        return vehicles[0];
      } catch (error) {
        // Handle unique constraint violation
        if (error.code === 'ER_DUP_ENTRY') {
          // Vehicle was created by another process, return the existing one
          return await this.findByLicensePlate(license_plate);
        }
        throw error;
      }
    }
  }

  /**
   * Register vehicle from car registry entry
   * @param {Object} carRegistryData - Car registry data
   * @returns {Promise<Object>} Vehicle record
   */
  static async registerFromCarRegistry(carRegistryData) {
    const { regno, model } = carRegistryData;
    
    if (!regno) {
      throw new Error('Vehicle registration number is required');
    }

    const vehicleData = {
      license_plate: regno,
      model: model || null
      // owner_name, phone_number, email will be updated later during payment
    };

    return await this.createOrUpdate(vehicleData);
  }

  /**
   * Update vehicle owner information during payment
   * @param {string} licensePlate - License plate
   * @param {Object} ownerData - Owner information
   * @returns {Promise<Object>} Updated vehicle
   */
  static async updateOwnerInfo(licensePlate, ownerData) {
    const { owner_name, phone_number, email } = ownerData;

    if (!licensePlate) {
      throw new Error('License plate is required');
    }

    const updateData = {};
    if (owner_name) updateData.owner_name = owner_name;
    if (phone_number) updateData.phone_number = phone_number;
    if (email) updateData.email = email;

    if (Object.keys(updateData).length === 0) {
      throw new Error('No owner information provided for update');
    }

    // Find vehicle by license plate
    const vehicle = await this.findByLicensePlate(licensePlate);
    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    return await this.update(vehicle.id, updateData);
  }

  /**
   * Find all vehicles with optional filtering
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} List of vehicles
   */
  static async findAll(filters = {}) {
    let query = 'SELECT * FROM vehicles WHERE 1=1';
    const values = [];
    let paramCount = 0;

    if (filters.license_plate) {
      paramCount++;
      query += ` AND license_plate LIKE ?`;
      values.push(`%${filters.license_plate}%`);
    }

    if (filters.owner_name) {
      paramCount++;
      query += ` AND owner_name LIKE ?`;
      values.push(`%${filters.owner_name}%`);
    }

    if (filters.phone_number) {
      paramCount++;
      query += ` AND phone_number LIKE ?`;
      values.push(`%${filters.phone_number}%`);
    }

    if (filters.make) {
      paramCount++;
      query += ` AND make LIKE ?`;
      values.push(`%${filters.make}%`);
    }

    if (filters.model) {
      paramCount++;
      query += ` AND model LIKE ?`;
      values.push(`%${filters.model}%`);
    }

    if (filters.has_owner_info === 'true') {
      query += ` AND owner_name IS NOT NULL AND phone_number IS NOT NULL`;
    }

    if (filters.has_owner_info === 'false') {
      query += ` AND (owner_name IS NULL OR phone_number IS NULL)`;
    }

    query += ' ORDER BY created_at DESC';

    try {
      const [vehicles] = await db.execute(query, values);
      return vehicles;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find vehicle by ID
   * @param {number} id - Vehicle ID
   * @returns {Promise<Object>} Vehicle data
   */
  static async findById(id) {
    const query = 'SELECT * FROM vehicles WHERE id = ?';
    
    try {
      const [vehicles] = await db.execute(query, [id]);
      return vehicles[0] || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find vehicle by license plate
   * @param {string} licensePlate - License plate
   * @returns {Promise<Object>} Vehicle data
   */
  static async findByLicensePlate(licensePlate) {
    const query = 'SELECT * FROM vehicles WHERE license_plate = ?';
    
    try {
      const [vehicles] = await db.execute(query, [licensePlate.toUpperCase()]);
      return vehicles[0] || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update vehicle information
   * @param {number} id - Vehicle ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated vehicle
   */
  static async update(id, updateData) {
    const { license_plate, make, model, owner_name, phone_number, email } = updateData;
    
    const query = `
      UPDATE vehicles 
      SET 
        ${license_plate !== undefined ? 'license_plate = ?,' : ''}
        ${make !== undefined ? 'make = ?,' : ''}
        ${model !== undefined ? 'model = ?,' : ''}
        ${owner_name !== undefined ? 'owner_name = ?,' : ''}
        ${phone_number !== undefined ? 'phone_number = ?,' : ''}
        ${email !== undefined ? 'email = ?,' : ''}
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    // Remove trailing comma
    const cleanQuery = query.replace(/,\s+WHERE/, ' WHERE');
    
    const values = [];
    if (license_plate !== undefined) values.push(license_plate.toUpperCase());
    if (make !== undefined) values.push(make);
    if (model !== undefined) values.push(model);
    if (owner_name !== undefined) values.push(owner_name);
    if (phone_number !== undefined) values.push(phone_number);
    if (email !== undefined) values.push(email);
    values.push(id);

    try {
      const [result] = await db.execute(cleanQuery, values);
      if (result.affectedRows === 0) {
        return null;
      }
      return await this.findById(id);
    } catch (error) {
      // Handle unique constraint violation
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('License plate already exists');
      }
      throw error;
    }
  }

  /**
   * Delete a vehicle record
   * @param {number} id - Vehicle ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    const query = 'DELETE FROM vehicles WHERE id = ?';
    
    try {
      const [result] = await db.execute(query, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Search vehicles by various criteria
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Matching vehicles
   */
  static async search(searchTerm) {
    const query = `
      SELECT * FROM vehicles 
      WHERE license_plate LIKE ? 
         OR owner_name LIKE ? 
         OR phone_number LIKE ? 
         OR email LIKE ?
         OR make LIKE ?
         OR model LIKE ?
      ORDER BY 
        CASE 
          WHEN license_plate LIKE ? THEN 1
          WHEN owner_name LIKE ? THEN 2
          ELSE 3
        END,
        created_at DESC
      LIMIT 50
    `;
    
    const searchPattern = `%${searchTerm}%`;
    
    try {
      const [vehicles] = await db.execute(query, [
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        `${searchTerm}%`, // Exact start match for license plate
        `${searchTerm}%`  // Exact start match for owner name
      ]);
      return vehicles;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get vehicles with their visit statistics
   * @param {number} limit - Number of vehicles to return
   * @returns {Promise<Array>} Vehicles with statistics
   */
  static async getVehiclesWithStats(limit = 50) {
    const query = `
      SELECT 
        v.*,
        COUNT(cr.id) as total_visits,
        COALESCE(SUM(cr.amount), 0) as total_spent,
        MAX(cr.updated_at) as last_visit,
        (SELECT service FROM car_registry WHERE regno = v.license_plate ORDER BY updated_at DESC LIMIT 1) as last_service
      FROM vehicles v
      LEFT JOIN car_registry cr ON v.license_plate = cr.regno
      GROUP BY v.id
      ORDER BY total_visits DESC, last_visit DESC
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
   * Get vehicles without owner information
   * @param {number} limit - Number of vehicles to return
   * @returns {Promise<Array>} Vehicles without owner info
   */
  static async getVehiclesWithoutOwnerInfo(limit = 50) {
    const query = `
      SELECT v.*, COUNT(cr.id) as visit_count
      FROM vehicles v
      LEFT JOIN car_registry cr ON v.license_plate = cr.regno
      WHERE v.owner_name IS NULL OR v.phone_number IS NULL
      GROUP BY v.id
      ORDER BY visit_count DESC, v.created_at DESC
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
   * Get frequently visiting vehicles
   * @param {number} minVisits - Minimum number of visits
   * @param {number} limit - Number of vehicles to return
   * @returns {Promise<Array>} Frequent vehicles
   */
  static async getFrequentVehicles(minVisits = 5, limit = 50) {
    const query = `
      SELECT 
        v.*,
        COUNT(cr.id) as total_visits,
        COALESCE(SUM(cr.amount), 0) as total_spent,
        MAX(cr.updated_at) as last_visit
      FROM vehicles v
      LEFT JOIN car_registry cr ON v.license_plate = cr.regno
      GROUP BY v.id
      HAVING total_visits >= ?
      ORDER BY total_visits DESC, last_visit DESC
      LIMIT ?
    `;
    
    try {
      const [vehicles] = await db.execute(query, [minVisits, limit]);
      return vehicles;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get vehicle statistics
   * @returns {Promise<Object>} Vehicle statistics
   */
  static async getStatistics() {
    const query = `
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(DISTINCT license_plate) as unique_vehicles,
        COUNT(*) FILTER (WHERE owner_name IS NOT NULL AND phone_number IS NOT NULL) as vehicles_with_owner_info,
        COUNT(*) FILTER (WHERE owner_name IS NULL OR phone_number IS NULL) as vehicles_without_owner_info,
        COUNT(DISTINCT make) as unique_makes,
        COUNT(DISTINCT model) as unique_models,
        AVG(visits.visit_count) as average_visits_per_vehicle
      FROM vehicles v
      LEFT JOIN (
        SELECT regno, COUNT(*) as visit_count 
        FROM car_registry 
        GROUP BY regno
      ) visits ON v.license_plate = visits.regno
    `;
    
    try {
      const [stats] = await db.execute(query);
      return stats[0] || {};
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Vehicle;