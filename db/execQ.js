const { extractMssqlError, writeJson } = require('../utils/logging');

// execQ(req, 'label', 'sql', inputs[], rowCtx, opTrail)
async function execQ({ req, label, sqlText, inputs, rowCtx, opTrail }) {
  try {
    if (inputs) for (const it of inputs) req.input(it.name, it.type, it.value);
    const res = await req.query(sqlText);
    opTrail && opTrail.push({ t: Date.now(), row: rowCtx?.row, op: label });
    return res;
  } catch (e) {
    const errInfo = extractMssqlError(e);
    const ctx = {
      when: new Date().toISOString(),
      row: rowCtx?.row,
      name: `${rowCtx?.firstName || ''} ${rowCtx?.lastName || ''}`.trim() || null,
      national_code: rowCtx?.nat || null,
      mobile: rowCtx?.mob || null,
      op: label,
      sql: sqlText,
      inputs: (inputs || []).reduce((o,it)=>(o[it.name]=it.value,o),{}),
      error: errInfo
    };
    const file = writeJson('import-fatal', ctx);
    console.error(`\n❌ خطا در ردیف ${rowCtx?.row} (${ctx.name || 'بدون‌نام'}) → ${label}`);
    console.error(`↪ MSSQL #${errInfo.number || '-'}: ${errInfo.message}`);
    console.error(`↪ جزئیات در فایل ${file}`);
    throw e;
  }
}

module.exports = { execQ };
