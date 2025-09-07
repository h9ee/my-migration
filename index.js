const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');

const { sql, getPool, getRequest } = require('./db/pool');
const { execQ } = require('./db/execQ');
const { processRow } = require('./services/processRow');
const { writeFatalWithContext, liveLog, writeJson } = require('./utils/logging');

(async () => {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  const reqFactory = () => getRequest(tx);

  const csvPath = path.join(__dirname, '../data/ab.csv');
  const csv = fs.createReadStream(csvPath).pipe(parse({ delimiter:',', from_line:2 }));

  const counters = { sales:0, projects:0, products:0, payments:0, skips:0 };
  const errs = [];
  const opTrail = [];
  let lastRowCtx = null;

  try {
    await tx.begin();
    await execQ({
      req: reqFactory(),
      label: 'session.setopts',
      sqlText: 'SET XACT_ABORT ON;',
      inputs: [],
      rowCtx: { row: 0 }, opTrail
    });

    let rowIdx = 1;
    for await (const row of csv) {
      rowIdx++;
      const roughName = `${(row[3]||'').trim()} ${(row[4]||'').trim()}`.trim();
      console.log(`\n▶️  Processing row ${rowIdx}${roughName?` — ${roughName}`:''}`);

      try {
        await processRow({
          row, rowIdx, reqFactory, opTrail, counters, errs,
          lastRowCtx
        });
      } catch (rowErr) {
        await tx.rollback();
        console.error(`\n❌ خطا در ردیف ${lastRowCtx?.row || rowIdx} → ${rowErr.message}`);
        console.error('↪ کل عملیات لغو شد (هیچ تغییری اعمال نشد).');
        try { await pool.close(); } catch {}
        process.exit(1);
      }

      liveLog(rowIdx, counters.sales, counters.projects, counters.products, counters.payments, counters.skips);
    }

    await tx.commit();

    console.log('\n--------- SUMMARY ---------');
    console.log(`Sales       : ${counters.sales}`);
    console.log(`Projects    : ${counters.projects}`);
    console.log(`Products    : ${counters.products}`);
    console.log(`Payments    : ${counters.payments}`);
    console.log(`Rows skipped: ${counters.skips}`);

    const filteredErrs = errs.filter(e => e.type === 'mismatch' || e.type === 'skip');
    const reportFile = writeJson('import-report', filteredErrs);
    console.log(`\nℹ️  گزارش در ${reportFile} ذخیره شد.`);

    await pool.close();
  } catch (fatal) {
    const { extractMssqlError } = require('./utils/logging');
    const errInfo = extractMssqlError(fatal);
    writeFatalWithContext({
      when: new Date().toISOString(),
      scope: 'fatal',
      lastRowCtx,
      lastOps: opTrail.slice(-5),
      error: errInfo
    });
    try { await pool.close(); } catch {}
    console.error('\n❌ خطای بحرانی:', errInfo.message);
    console.error('↪ کل عملیات لغو شد (هیچ تغییری اعمال نشد).');
    process.exit(1);
  }
})();
