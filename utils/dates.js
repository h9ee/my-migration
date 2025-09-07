const jalaali = require('jalaali-js');
const pad = n => String(n).padStart(2, '0');

function toISO(j) {
  const raw = (j || '').toString().trim();
  if (!raw || raw === '*') return null;
  const parts = raw.split('/').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [a,b,c] = parts;
  if (a < 1900) {
    const { gy, gm, gd } = jalaali.toGregorian(a, b, c);
    return `${gy}-${pad(gm)}-${pad(gd)}T00:00:00+03:30`;
  }
  return `${a}-${pad(b)}-${pad(c)}T00:00:00+03:30`;
}

module.exports = { toISO, pad };
