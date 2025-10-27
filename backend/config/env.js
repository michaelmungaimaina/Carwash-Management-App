require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  DATABASE_URL: process.env.DATABASE_URL,
  HOST: process.env.DB_HOST || 'localhost',
  USER: process.env.DB_USER || 'root',
  PASSWORD: process.env.DB_PASSWORD,
  DATABASE: process.env.DB_NAME || 'lex_carwash',
  JWT_SECRET: process.env.JWT_SECRET,
  MPESA_CONSUMER_KEY: process.env.MPESA_CONSUMER_KEY,
  MPESA_CONSUMER_SECRET: process.env.MPESA_CONSUMER_SECRET,
  MPESA_PASSKEY: process.env.MPESA_PASSKEY,
  MPESA_SHORTCODE: process.env.MPESA_SHORTCODE,
  MPESA_CALLBACK_URL: process.env.MPESA_CALLBACK_URL,
};