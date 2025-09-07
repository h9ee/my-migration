// src/utils/jdate.js

// Convert Persian/Arabic digits to English
function toEnDigits(str) {
  return (str ?? '').toString()
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}

function pad2(n) {
  n = String(n);
  return n.length === 1 ? '0' + n : n;
}

/**
 * Normalize a Jalali date string into 'YYYY-MM-DD' (string).
 * Accepts inputs like:
 *  - '1400/5/7', '1400-05-07', '۱۴۰۰/۰۵/۰۷', '1400 . 5 . 7'
 * Returns null if not parseable.
 */
function normalizeJalaliYYYYMMDD(raw) {
  const s0 = toEnDigits(raw).trim();
  if (!s0) return null;

  // Accept separators: '/', '-', '.', or whitespace
  const m = s0.match(/^(\d{2,4})[\s./-](\d{1,2})[\s./-](\d{1,2})$/);
  if (!m) return null;

  const yy = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const dd = parseInt(m[3], 10);

  if (isNaN(yy) || isNaN(mm) || isNaN(dd)) return null;
  if (mm < 1 || mm > 12) return null;
  if (dd < 1 || dd > 31) return null;

  return `${yy}-${pad2(mm)}-${pad2(dd)}`;
}

module.exports = { normalizeJalaliYYYYMMDD, toEnDigits };
