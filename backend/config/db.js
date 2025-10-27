require('dotenv').config();
const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lex_carwash',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const testConnection = async () => {
  try {
    const [rows] = await db.query('SELECT NOW() AS now');
    console.log('✅ Database connected:', rows[0]);
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
  }
};

module.exports = {
  db,
  testConnection
}