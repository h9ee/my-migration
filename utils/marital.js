// src/utils/marital.js
const { toEnDigits } = require('./digits');

function normalizeMarital(raw) {
  const s = (raw ?? '').toString().trim();
  const f = toEnDigits(s).replace(/\s+/g,'');
  if (!f) return null;
  // پوشش رایج فارسی:
  if (/(مجرد|sing(le)?)/i.test(f))  return 'single';
  if (/(متاهل|متأهل|married)/i.test(f)) return 'married';
  return null; // ناشناخته → null
}

module.exports = { normalizeMarital };
