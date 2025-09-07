require('dotenv').config();

const shared = {
  server: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  port: +process.env.DB_PORT || 1433,
  options: {
    encrypt: String(process.env.DB_ENCRYPT).toLowerCase() === 'true',
    trustServerCertificate: String(process.env.DB_TRUST_CERT).toLowerCase() !== 'false'
  }
};

module.exports = {
  dbSales: { ...shared, database: process.env.TARGET_DB_SALES },
  USER_DB: process.env.TARGET_DB_USER || 'user_db',
  PROJECT_DB: process.env.TARGET_DB_SALES || 'sales_db',
  PAYMENT_DB: process.env.TARGET_DB_PAYMENT || 'payment_db',
  REGISTER_NOMINAL: +process.env.REGISTER_NOMINAL || 900000,
  DEFAULT_SELLER_ID: +process.env.DEFAULT_SELLER_ID || 1,
};
