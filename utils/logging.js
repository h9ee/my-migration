const fs = require('fs');
const path = require('path');

function extractMssqlError(err) {
  const oe = err?.originalError || {};
  const info = oe?.info || {};
  return {
    message: err?.message,
    code: err?.code,
    number: err?.number ?? info.number,
    state: err?.state ?? info.state,
    class: err?.class ?? info.class,
    lineNumber: err?.lineNumber ?? info.lineNumber,
    serverName: err?.serverName ?? info.serverName,
    procName: err?.procName ?? info.procName,
    precedingErrors: err?.precedingErrors || [],
  };
}

function writeJson(filename, data) {
  const file = `${filename}-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
  fs.writeFileSync(path.join(__dirname, '../../', file), JSON.stringify(data, null, 2), 'utf8');
  return file;
}

function writeFatalWithContext(ctx) {
  const file = writeJson('import-fatal', ctx);
  console.error(`↪ جزئیات خطا در فایل ${file} ذخیره شد.`);
}

function liveLog(row, sales, projects, products, payments, skips) {
  process.stdout.write(
    `\rRow: ${row} | Sales: ${sales} | Projects: ${projects} | Products: ${products} | Payments: ${payments} | Skips: ${skips}`
  );
}

module.exports = { extractMssqlError, writeJson, writeFatalWithContext, liveLog };
