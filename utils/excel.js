// src/utils/excel.js

/**
 * Convert Excel column letters (A, B, ..., Z, AA, AB, ...) to zero-based index.
 * @param {string} letters
 * @returns {number|null}
 */
function excelColToIndex(letters) {
  if (!letters || typeof letters !== 'string') return null;
  const str = letters.trim().toUpperCase();
  if (!str) return null;

  let idx = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 65 || code > 90) return null; // only A..Z
    idx = idx * 26 + (code - 64); // A=1 .. Z=26
  }
  return idx - 1;
}

/**
 * Safely read a cell from parsed CSV/Excel row with either numeric index or letter(s).
 * @param {string[]} row - array of string values for the row
 * @param {string|number|null|undefined} col - e.g. 0 or 'A' or 'AF'
 * @returns {string|null}
 */
function excelCell(row, col) {
  if (!row || col == null) return null;

  if (typeof col === 'number') {
    return row[col] ?? null;
  }
  if (typeof col === 'string') {
    const idx = excelColToIndex(col);
    return idx == null ? null : (row[idx] ?? null);
  }
  return null;
}

module.exports = { excelCell, excelColToIndex };
