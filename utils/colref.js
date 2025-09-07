function excelColToIndex(col) {
  if (col == null) return null;
  if (typeof col === 'number' && Number.isInteger(col)) return col; // 0-based
  const s = String(col).trim();
  if (/^\d+$/.test(s)) return parseInt(s, 10); // اجازه‌ی 0-based عددی
  if (!/^[A-Za-z]+$/.test(s)) return null;
  let n = 0, up = s.toUpperCase();
  for (let i = 0; i < up.length; i++) n = n * 26 + (up.charCodeAt(i) - 64);
  return n - 1;
}
function cellByRef(row, ref) {
  const idx = excelColToIndex(ref);
  return idx == null ? null : row[idx];
}
module.exports = { excelColToIndex, cellByRef };