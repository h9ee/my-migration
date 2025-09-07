function toEnDigits(str='') {
  return String(str)
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}

function normalizeMobile(raw) {
  const s = toEnDigits(raw).replace(/\D/g, '');
  let m = s;
  if (m.startsWith('0098')) m = '0' + m.slice(4);
  else if (m.startsWith('098')) m = '0' + m.slice(3);
  else if (m.startsWith('98'))  m = '0' + m.slice(2);
  else if (m.length === 10 && m[0] === '9') m = '0' + m;

  return (m && m.length === 11 && m.startsWith('0')) ? m : null;
}

function nat10(nat) {
  if (!nat) return '';
  const clean = toEnDigits(nat);
  return clean.padStart(10, '0').slice(-10);
}
const toNum  = s => Number(String(s ?? '').replace(/[,*\s]/g, '')) || 0;

module.exports = { toEnDigits, normalizeMobile, nat10, toNum };
