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

// --- Whitelist برای نام دیتابیس‌ها ---
const ALLOWED_DATABASES = (process.env.ALLOWED_DATABASES || '').split(',').map(s => s.trim()).filter(Boolean);

function getSafeDbName(envVar, defaultValue) {
  const dbName = process.env[envVar] || defaultValue;
  if (ALLOWED_DATABASES.length > 0 && !ALLOWED_DATABASES.includes(dbName)) {
    console.error(`❌ نام دیتابیس نامعتبر: "${dbName}". این نام در لیست ALLOWED_DATABASES فایل .env وجود ندارد.`);
    process.exit(1);
  }
  return dbName;
}
// ------------------------------------

module.exports = {
  dbSales: { ...shared, database: getSafeDbName('TARGET_DB_SALES') },
  USER_DB: getSafeDbName('TARGET_DB_USER', 'user_db'),
  PROJECT_DB: getSafeDbName('TARGET_DB_SALES', 'sales_db'),
  PAYMENT_DB: getSafeDbName('TARGET_DB_PAYMENT', 'payment_db'),
  REGISTER_NOMINAL: +process.env.REGISTER_NOMINAL || 900000,
  DEFAULT_SELLER_ID: +process.env.DEFAULT_SELLER_ID || 1,
};