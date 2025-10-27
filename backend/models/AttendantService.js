const { db } = require('../config/db');

/**
 * Attendant Service model for tracking services provided by attendants
 * ID Format: yyyddmmhhMMsss (e.g., 231215143045123)
 */
class AttendantService {
    /**
     * Generate custom ID in format: yyyddmmhhMMsss
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
     * @param {string} id - Attendant service ID in yyyddmmhhMMsss format
     * @returns {Object} Parsed date components
     */
    static parseId(id) {
        if (id.length !== 15) {
            throw new Error('Invalid ID format. Expected yyyddmmhhMMsss');
        }

        const year = '20' + id.substring(0, 2); // YY -> YYYY
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
     * Get readable date time from ID
     * @param {string} id - Attendant service ID
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

    /**
     * Create a new attendant service record
     * @param {Object} serviceData - Service data
     * @returns {Promise<Object>} Created service record
     */
    static async create(serviceData) {
        const { car_id, attendant_id, service, amount } = serviceData;

        // Validate required fields
        if (!car_id || !attendant_id || !service || !amount) {
            throw new Error('Missing required fields: car_id, attendant_id, service, amount');
        }

        const id = this.generateId();
        // Check for existing record for same car, service, and day
        const exists = await this.existsForDay(car_id, service);
        if (exists) {
            throw new Error(`Service ${service} for this car already exists for today`);
        } 

        const query = `
      INSERT INTO attendant_service (id, car_id, attendant_id, service, amount)
      VALUES (?, ?, ?, ?, ?)
    `;

        const values = [id, car_id, attendant_id, service, parseFloat(amount)];

        try {
            const [result] = await db.execute(query, values);
            return await this.findById(id);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Check if the same car & service exists for the same day
     */
    static async existsForDay(car_id, service) {
        //const todayPrefix = id.toString().slice(0, 8); // yyyymmdd
        const query = `
      SELECT id 
      FROM attendant_service
      WHERE service = ?
        AND car_id = ?
      LIMIT 1
    `;
        const [rows] = await db.query(query, [service, car_id]);
        return rows.length > 0;
    }

    /**
     * Find all attendant services with optional filtering
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Array>} List of attendant services
     */
    static async findAll(filters = {}) {
        let query = `
      SELECT asr.*, 
             cr.regno as car_regno,
             cr.model as car_model,
             u.name as attendant_name,
             b.name as branch_name
      FROM attendant_service asr
      LEFT JOIN car_registry cr ON asr.car_id = cr.id
      LEFT JOIN users u ON asr.attendant_id = u.id
      LEFT JOIN branches b ON cr.branch_id = b.id
      WHERE 1=1
    `;
        const values = [];
        let paramCount = 0;

        if (filters.attendant_id) {
            paramCount++;
            query += ` AND asr.attendant_id = ?`;
            values.push(filters.attendant_id);
        }

        if (filters.car_id) {
            paramCount++;
            query += ` AND asr.car_id = ?`;
            values.push(filters.car_id);
        }

        if (filters.service) {
            paramCount++;
            query += ` AND asr.service LIKE ?`;
            values.push(`%${filters.service}%`);
        }

        if (filters.branch_id) {
            paramCount++;
            query += ` AND cr.branch_id = ?`;
            values.push(filters.branch_id);
        }

        if (filters.start_date && filters.end_date) {
            // Use ID pattern matching for date range
            const startDate = new Date(filters.start_date);
            const endDate = new Date(filters.end_date);

            const startYear = startDate.getFullYear().toString().slice(-2);
            const startDay = startDate.getDate().toString().padStart(2, '0');
            const startMonth = (startDate.getMonth() + 1).toString().padStart(2, '0');
            const startPattern = `${startYear}${startDay}${startMonth}%`;

            const endYear = endDate.getFullYear().toString().slice(-2);
            const endDay = endDate.getDate().toString().padStart(2, '0');
            const endMonth = (endDate.getMonth() + 1).toString().padStart(2, '0');
            const endPattern = `${endYear}${endDay}${endMonth}%`;

            paramCount += 2;
            query += ` AND asr.id BETWEEN ? AND ?`;
            values.push(startPattern, endPattern);
        }

        query += ' ORDER BY asr.id DESC';

        try {
            const [services] = await db.execute(query, values);
            return services;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Find attendant service by ID
     * @param {string} id - Service record ID
     * @returns {Promise<Object>} Service record data
     */
    static async findById(id) {
        const query = `
      SELECT asr.*, 
             cr.regno as car_regno,
             cr.model as car_model,
             u.name as attendant_name,
             b.name as branch_name
      FROM attendant_service asr
      LEFT JOIN car_registry cr ON asr.car_id = cr.id
      LEFT JOIN users u ON asr.attendant_id = u.id
      LEFT JOIN branches b ON cr.branch_id = b.id
      WHERE asr.id = ?
    `;

        try {
            const [services] = await db.execute(query, [id]);
            return services[0] || null;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Find attendant services for a specific day using ID format
     * @param {string} date - Date in YYYY-MM-DD format
     * @param {string} attendant_id - Optional attendant ID filter
     * @returns {Promise<Array>} Attendant services for the day
     */
    static async findByDate(date, attendant_id = null) {
        // Extract year, month, day from date
        const dateObj = new Date(date);
        const year = dateObj.getFullYear().toString().slice(-2);
        const day = dateObj.getDate().toString().padStart(2, '0');
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');

        // ID format: yyyddmmhhMMsss - we need to match yyyddmm
        const datePattern = `${year}${day}${month}%`;

        let query = `
      SELECT asr.*, 
             cr.regno as car_regno,
             cr.model as car_model,
             u.name as attendant_name,
             b.name as branch_name
      FROM attendant_service asr
      LEFT JOIN car_registry cr ON asr.car_id = cr.id
      LEFT JOIN users u ON asr.attendant_id = u.id
      LEFT JOIN branches b ON cr.branch_id = b.id
      WHERE asr.id LIKE ?
    `;

        const values = [datePattern];

        if (attendant_id) {
            query += ` AND asr.attendant_id = ?`;
            values.push(attendant_id);
        }

        query += ' ORDER BY asr.id DESC';

        try {
            const [services] = await db.execute(query, values);
            return services;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Find services by attendant ID
     * @param {string} attendant_id - Attendant ID
     * @param {Object} filters - Additional filters
     * @returns {Promise<Array>} Services by attendant
     */
    static async findByAttendantId(attendant_id, filters = {}) {
        let query = `
      SELECT asr.*, 
             cr.regno as car_regno,
             cr.model as car_model,
             u.name as attendant_name,
             b.name as branch_name
      FROM attendant_service asr
      LEFT JOIN car_registry cr ON asr.car_id = cr.id
      LEFT JOIN users u ON asr.attendant_id = u.id
      LEFT JOIN branches b ON cr.branch_id = b.id
      WHERE asr.attendant_id = ?
    `;

        const values = [attendant_id];
        let paramCount = 1;

        if (filters.start_date && filters.end_date) {
            const startDate = new Date(filters.start_date);
            const endDate = new Date(filters.end_date);

            const startYear = startDate.getFullYear().toString().slice(-2);
            const startDay = startDate.getDate().toString().padStart(2, '0');
            const startMonth = (startDate.getMonth() + 1).toString().padStart(2, '0');
            const startPattern = `${startYear}${startDay}${startMonth}%`;

            const endYear = endDate.getFullYear().toString().slice(-2);
            const endDay = endDate.getDate().toString().padStart(2, '0');
            const endMonth = (endDate.getMonth() + 1).toString().padStart(2, '0');
            const endPattern = `${endYear}${endDay}${endMonth}%`;

            paramCount += 2;
            query += ` AND asr.id BETWEEN ? AND ?`;
            values.push(startPattern, endPattern);
        }

        if (filters.service) {
            paramCount++;
            query += ` AND asr.service LIKE ?`;
            values.push(`%${filters.service}%`);
        }

        query += ' ORDER BY asr.id DESC';

        try {
            const [services] = await db.execute(query, values);
            return services;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Find services by car ID
     * @param {string} car_id - Car registry ID
     * @returns {Promise<Array>} Services for the car
     */
    static async findByCarId(car_id) {
        const query = `
      SELECT asr.*, u.name as attendant_name
      FROM attendant_service asr
      LEFT JOIN users u ON asr.attendant_id = u.id
      WHERE asr.car_id = ?
      ORDER BY asr.id DESC
    `;

        try {
            const [services] = await db.execute(query, [car_id]);
            return services;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Update attendant service record
     * @param {string} id - Service record ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Updated service record
     */
    static async update(id, updateData) {
        const { car_id, attendant_id, service, amount } = updateData;

        const query = `
      UPDATE attendant_service 
      SET car_id = ?, attendant_id = ?, service = ?, amount = ?
      WHERE id = ?
    `;

        const values = [car_id, attendant_id, service, parseFloat(amount), id];

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
     * Delete an attendant service record
     * @param {string} id - Service record ID
     * @returns {Promise<boolean>} Success status
     */
    static async delete(id) {
        const query = 'DELETE FROM attendant_service WHERE id = ?';

        try {
            const [result] = await db.execute(query, [id]);
            return result.affectedRows > 0;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get attendant performance statistics
     * @param {string} attendantId - Attendant ID
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Object>} Performance statistics
     */
    static async getAttendantPerformance(attendantId, filters = {}) {
        let query = `
      SELECT 
        COUNT(*) as total_services,
        COALESCE(SUM(amount), 0) as total_revenue,
        service,
        COUNT(*) as service_count,
        COALESCE(SUM(amount), 0) as service_revenue
      FROM attendant_service
      WHERE attendant_id = ?
    `;

        const values = [attendantId];
        let paramCount = 1;

        if (filters.start_date && filters.end_date) {
            const startDate = new Date(filters.start_date);
            const endDate = new Date(filters.end_date);

            const startYear = startDate.getFullYear().toString().slice(-2);
            const startDay = startDate.getDate().toString().padStart(2, '0');
            const startMonth = (startDate.getMonth() + 1).toString().padStart(2, '0');
            const startPattern = `${startYear}${startDay}${startMonth}%`;

            const endYear = endDate.getFullYear().toString().slice(-2);
            const endDay = endDate.getDate().toString().padStart(2, '0');
            const endMonth = (endDate.getMonth() + 1).toString().padStart(2, '0');
            const endPattern = `${endYear}${endDay}${endMonth}%`;

            paramCount += 2;
            query += ` AND id BETWEEN ? AND ?`;
            values.push(startPattern, endPattern);
        }

        query += ' GROUP BY service ORDER BY service_revenue DESC';

        try {
            const [stats] = await db.execute(query, values);

            const result = {
                total_services: 0,
                total_revenue: 0,
                service_breakdown: stats
            };

            if (stats.length > 0) {
                // Calculate totals
                const totalQuery = `
          SELECT 
            COUNT(*) as total_services,
            COALESCE(SUM(amount), 0) as total_revenue
          FROM attendant_service
          WHERE attendant_id = ?
          ${filters.start_date && filters.end_date ? 'AND id BETWEEN ? AND ?' : ''}
        `;

                const totalResult = await db.execute(totalQuery, values);

                if (totalResult[0].length > 0) {
                    result.total_services = parseInt(totalResult[0][0].total_services);
                    result.total_revenue = parseFloat(totalResult[0][0].total_revenue);
                }
            }

            return result;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get daily attendant service report
     * @param {string} date - Date in YYYY-MM-DD format
     * @param {string} branch_id - Optional branch ID
     * @returns {Promise<Array>} Daily report
     */
    static async getDailyReport(date, branch_id = null) {
        const dateObj = new Date(date);
        const year = dateObj.getFullYear().toString().slice(-2);
        const day = dateObj.getDate().toString().padStart(2, '0');
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const datePattern = `${year}${day}${month}%`;

        let query = `
      SELECT 
        asr.*,
        cr.regno as car_regno,
        cr.model as car_model,
        u.name as attendant_name,
        b.name as branch_name
      FROM attendant_service asr
      LEFT JOIN car_registry cr ON asr.car_id = cr.id
      LEFT JOIN users u ON asr.attendant_id = u.id
      LEFT JOIN branches b ON cr.branch_id = b.id
      WHERE asr.id LIKE ?
    `;

        const values = [datePattern];

        if (branch_id) {
            query += ` AND cr.branch_id = ?`;
            values.push(branch_id);
        }

        query += ' ORDER BY asr.id DESC';

        try {
            const [report] = await db.execute(query, values);
            return report;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = AttendantService;