const { db } = require('../config/db');
const { bcrypt } = require('bcrypt');
//import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

const UserModel = {

  async findByUsername(username) {
    try {
      const [rows] = await db.query("SELECT * FROM users WHERE username = ?", [username]);

      if (!rows.length) {
        console.log('No user found for username:', username);
        return null;
      }

      console.log('Returned Row:', rows[0]);
      return rows[0];
    } catch (error) {
      console.error('Error in findByUsername:', error.message);
      throw error;
    }
  },

  async findById(id) {
    try {
      const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [id]);

      if (!rows.length) {
        console.log('No user found for id:', id);
        return null;
      }

      console.log('Returned Row:', rows[0]);
      return rows[0];
    } catch (error) {
      console.error('Error in findById:', error.message);
      throw error;
    }
  },

  /**
    * Find a user by phone number
    */
  async findByPhone(phone_number) {
    const [rows] = await db.query("SELECT * FROM users WHERE phone = ?", [phone_number]);
    return rows[0];
  },

  /**
   * Hash a plain text password before saving
   */
  async hashPassword(plainPassword) {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(plainPassword, salt);
    return hash;
  },

  /**
   * Verify if a plain text password matches a hashed one
   */
  async verifyPassword(plainPassword, hashedPassword) {
    //return await bcrypt.compare(plainPassword, hashedPassword);
    return plainPassword === hashedPassword;
  },

  /**
   * Get all users
   */
  async findAll() {
    try {
      const [rows] = await db.query("SELECT * FROM users ORDER BY created_at DESC");
      return rows;
    } catch (error) {
      console.error('Error fetching users:', error.message);
      throw error;
    }
  },

  /**
   * Create new user
   */
  async create({ id, id_number, name, avatar, phone, employment_type, salary, username, password, role, access_level }) {
    try {
      // Check if id_number, phone, or username already exists
      const [existing] = await db.query(
        `SELECT id_number, phone, username 
       FROM users 
       WHERE id_number = ? OR phone = ? OR username = ? 
       LIMIT 1`,
        [id_number, phone, username]
      );

      if (existing.length > 0) {
        const existingUser = existing[0];
        if (existingUser.id_number === id_number) {
          throw new Error('ID number already exists');
        }
        if (existingUser.phone === phone) {
          throw new Error('Phone number already exists');
        }
        if (existingUser.username === username) {
          throw new Error('Username already exists');
        }
      }

      //Insert new user
      await db.query(
        `INSERT INTO users 
       (id, id_number, name, avatar, phone, employment_type, salary, username, password, role, access_level, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [id, id_number, name, avatar, phone, employment_type, salary, username, password, role, access_level]
      );

      //Retrieve and return the new user
      const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [id]);
      return rows[0];
    } catch (error) {
      console.error('Error creating user:', error.message);
      throw error;
    }
  },

  /**
   * Update user details
   */
  async update(id, updateData) {
    try {
      if (!updateData || Object.keys(updateData).length === 0) {
        throw new Error('No fields provided to update');
      }

      // If updating phone, username, or id_number — check for duplicates
      const uniqueFields = ['phone', 'username', 'id_number'];
      const uniqueChecks = uniqueFields.filter(field => field in updateData);

      for (const field of uniqueChecks) {
        const value = updateData[field];
        const [existing] = await db.query(
          `SELECT id FROM users WHERE ${field} = ? AND id != ? LIMIT 1`,
          [value, id]
        );

        if (existing.length > 0) {
          throw new Error(`${field.replace('_', ' ')} already exists`);
        }
      }

      // Build the dynamic SQL for updating only provided fields
      const fields = Object.keys(updateData);
      const values = Object.values(updateData);

      const setClause = fields.map(field => `${field} = ?`).join(', ');

      const sql = `
      UPDATE users
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

      await db.query(sql, [...values, id]);

      // Fetch and return the updated record
      const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
      return rows[0];
    } catch (error) {
      console.error('Error updating user:', error.message);
      throw error;
    }
  },

  /**
   * Update username and password
   */
  async updateUsernamePassword({ id, username, password }) {
    try {
      await db.query(
        `UPDATE users 
         SET username = ?, password = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [username, password, id]
      );

      const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [id]);
      return rows[0];
    } catch (error) {
      console.error('Error updating user credentials:', error.message);
      throw error;
    }
  },

  async updatePassword(id, newPassword) {
    try {
      // Check if user exists
      const [existing] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
      if (existing.length === 0) {
        return { success: false, message: 'User not found' };
      }

      // Hash the new password
      //const salt = await bcrypt.genSalt(SALT_ROUNDS);
      //const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update the password and updated_at timestamp
      await db.query(
        `UPDATE users 
       SET password = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
        //[hashedPassword, id]
        [newPassword, id]
      );

      // Return the updated user (without the password)
      const [rows] = await db.query('SELECT id, username, name, role, access_level, updated_at FROM users WHERE id = ?', [id]);
      const updatedUser = rows[0];

      return {
        success: true,
        message: 'Password updated successfully',
        user: updatedUser
      };

    } catch (error) {
      console.error('Error updating password:', error.message);
      throw error;
    }
  },

  /**
   * Check if user exists in car_registry
   */
  async checkUserInCarRegistry(userId) {
    const [rows] = await db.query(
      `SELECT 1 FROM car_registry WHERE user_id = ? LIMIT 1`,
      [userId]
    );
    return rows.length > 0;
  },

  /**
   * Deactivate user (change role to inactive)
   */
  async deactivateUser(id) {
    try {
      await db.query(
        `UPDATE users 
         SET role = 'inactive', updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [id]
      );

      const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [id]);
      return rows[0];
    } catch (error) {
      console.error('Error deactivating user:', error.message);
      throw error;
    }
  },

  /**
   * Delete user
   */
  async deleteUser(id) {
    try {
      // Define tables that may reference the user
      const referenceTables = [
        { table: 'car_registry', column: 'user_id' },
        { table: 'carpets', column: 'user_id' },
        { table: 'payments', column: 'user_id' }
      ];

      let isReferenced = false;

      // Check if user is referenced in any of the tables
      for (const { table, column } of referenceTables) {
        const [rows] = await db.query(
          `SELECT 1 FROM ${table} WHERE ${column} = ? LIMIT 1`,
          [id]
        );
        if (rows.length > 0) {
          isReferenced = true;
          break;
        }
      }

      // If referenced, deactivate instead of deleting
      if (isReferenced) {
        await db.query(
          `UPDATE users 
         SET role = 'inactive', updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
          [id]
        );

        const [updated] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
        return {
          success: true,
          action: 'deactivated',
          message: 'User is referenced in other tables and has been deactivated instead.',
          user: updated[0]
        };
      }

      // If not referenced, safely delete user
      const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
      const user = rows[0];

      if (!user) {
        return { success: false, message: 'User not found' };
      }

      await db.query('DELETE FROM users WHERE id = ?', [id]);

      return {
        success: true,
        action: 'deleted',
        message: 'User deleted successfully',
        user
      };
    } catch (error) {
      console.error('Error deleting user:', error.message);
      throw error;
    }
  }

};

module.exports = UserModel;
