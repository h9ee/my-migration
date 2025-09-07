// config/validateEnv.js
function validateEnv() {
  const requiredVars = [
    'DB_HOST',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_PORT',
    'TARGET_DB_SALES',
    'TARGET_DB_USER',
    'TARGET_DB_PAYMENT',
  ];

  const missingVars = requiredVars.filter(v => !(v in process.env));

  if (missingVars.length > 0) {
    console.error('❌ خطای پیکربندی: متغیرهای محیطی زیر در فایل .env تعریف نشده‌اند:');
    missingVars.forEach(v => console.error(`  - ${v}`));
    process.exit(1);
  }
}

module.exports = { validateEnv };