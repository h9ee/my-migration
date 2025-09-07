// src/services/processRow.js
const { toNum, normalizeMobile } = require('../utils/digits');
const { toISO } = require('../utils/dates');
const { excelCell } = require('../utils/excel');
const { ensureUserAndInfo } = require('./ensureUserAndInfo');
const { resolveSellerId } = require('../repos/sellersRepo');
const {
  insertOrderSale,
  insertRegisterSale,
  findExistingRegisterSale,
  insertSaleProjects,
  insertSaleProducts,
  insertSaleSeller,
} = require('../repos/salesRepo');
const { addPayment } = require('./addPayment');

const {
  USERS_COLS: USERS,
  ORDER_COLS: ORDER,
  INST_BLOCKS,
  LEFTOVER_COLS: LEFTOVER,
  REGISTER_COLS: REGISTER,
  GUARD_COLS: GUARD,
  WAREHOUSE_MAP,
  BRANCH_COL: BRANCH
} = require('../config/columns');
const { REGISTER_NOMINAL } = require('../config/env');

function safeExcel(row, col) {
  if (!col) return null;
  return excelCell(row, col);
}
function parseDateFromCell(row, col) {
  const raw = safeExcel(row, col);
  const iso = toISO(raw);
  return iso ? new Date(iso) : null;
}
function sumAmountBlocks(row, blocks) {
  let total = 0;
  for (const block of (blocks || [])) {
    const amountCol = block[1]; // [type, amount, due, receive, bank, doc]
    const amt = toNum(safeExcel(row, amountCol));
    if (amt) total += amt;
  }
  return total;
}

async function processRow(ctx) {
  const { row, rowIdx, reqFactory, opTrail, counters, errs } = ctx;

  const fn      = (safeExcel(row, USERS.firstName) || '').trim();
  const ln      = (safeExcel(row, USERS.lastName)  || '').trim();
  const nat     = (safeExcel(row, USERS.national)  || '').trim();
  const mobRaw  = (safeExcel(row, USERS.mobile)    || '').trim();
  const mobNorm = normalizeMobile(mobRaw);
  ctx.lastRowCtx = { row: rowIdx, firstName: fn, lastName: ln, nat, mob: mobRaw };

  // Guard: اگر ستونی مثل C باید مقدار داشته باشد
  if (GUARD && GUARD.mustHave) {
    const must = toNum(safeExcel(row, GUARD.mustHave));
    if (!must) {
      counters.skips++;
      errs.push({ row: rowIdx, type: 'skip', msg: `Guard ${GUARD.mustHave} empty` });
      return;
    }
  }

  // کاربر و user_info
  let userId;
  try {
    const res = await ensureUserAndInfo(reqFactory, row, ctx.lastRowCtx, opTrail);
    userId = res.userId;
  } catch (e) {
    if (e._skip_row) {
      counters.skips++;
      errs.push({ row: rowIdx, type: 'skip', reason: e._reason || 'unknown', msg: e.message });
      return;
    }
    throw e;
  }

  // فروشنده/شعبه
  const sellerRaw = (safeExcel(row, BRANCH?.branchName) || '').trim();
  const sellerId  = await resolveSellerId(reqFactory, sellerRaw, ctx.lastRowCtx, opTrail);

  // ORDER: قیمت کل = قیمت‌واحد × تعداد
  const unitPrice = Number(safeExcel(row, ORDER.unitPrice)) || 0;
  let quantity    = toNum(safeExcel(row, ORDER.quantity));
  if (!Number.isFinite(quantity) || quantity <= 0) {
    quantity = 1; // جلوگیری از NULL در DB
    errs.push({ row: rowIdx, type: 'autofix', field: 'quantity', msg: 'quantity نامعتبر بود؛ 1 ست شد.' });
  }
  const expected  = unitPrice * quantity;

  let tsOrd = parseDateFromCell(row, ORDER.orderDate);
  if (!(tsOrd instanceof Date) || isNaN(tsOrd.getTime())) tsOrd = new Date();
  const tsOrdISO = tsOrd.toISOString();

  // مجموع پرداخت‌ها = OP + INST + LEFTOVER
  const opSum    = sumAmountBlocks(row, ORDER.OP_BLOCKS || []);
  const instSum  = sumAmountBlocks(row, INST_BLOCKS || []);
  const leftoverAmt = (LEFTOVER && LEFTOVER.amount) ? (toNum(safeExcel(row, LEFTOVER.amount)) || 0) : 0;
  const planned  = opSum + instSum + leftoverAmt;

  const ordStatus = (expected === planned) ? 12 : 35;

  // درج Sales (order)
  const saleIdOrd = await insertOrderSale(
    reqFactory,
    { userId, sellerId, ordTotal: expected, fn, ln, mob: mobNorm, nat, ordStatus, tsOrd: tsOrdISO },
    ctx.lastRowCtx,
    opTrail
  );
  counters.sales++;

  if (expected !== planned) {
    errs.push({ row: rowIdx, type: 'mismatch', section: 'ORDER', expected, planned });
    console.log(`   ⚠️ Mismatch: expected=${expected} planned=${planned} (includes OP + INST + LEFTOVER)`);
  }

  // پرداخت‌های اولیه (OP_BLOCKS) → install:false
  for (const block of (ORDER.OP_BLOCKS || [])) {
    const [ty, amtCol, dueCol, rcvCol, bankCol, docCol] = block;
    const amt = toNum(safeExcel(row, amtCol));
    if (!amt) continue;
    await addPayment(
      reqFactory,
      {
        saleId: saleIdOrd,
        userId,
        fa: safeExcel(row, ty),
        amount: amt,
        dueJ: safeExcel(row, dueCol),
        rcvJ: safeExcel(row, rcvCol),
        bank: safeExcel(row, bankCol),
        doc: safeExcel(row, docCol),
        install: false,
      },
      ctx.lastRowCtx,
      opTrail
    );
    counters.payments++;
  }

  // اقساط (INST_BLOCKS) → install:true
  for (const block of (INST_BLOCKS || [])) {
    const [ty, amtCol, dueCol, rcvCol, bankCol, docCol] = block;
    const amt = toNum(safeExcel(row, amtCol));

    // --- دستور اشکال‌زدایی ---
    // این خط به شما نشان می‌دهد که آیا برنامه مبلغی برای قسط پیدا کرده است یا خیر
    if (amt > 0) {
      console.log(`   [قسط] مبلغ ${amt} از ستون ${amtCol} برای ردیف ${rowIdx} پیدا شد.`);
    }
    // -------------------------

    if (!amt) continue;
    await addPayment(
      reqFactory,
      {
        saleId: saleIdOrd,
        userId,
        fa: safeExcel(row, ty),
        amount: amt,
        dueJ: safeExcel(row, dueCol),
        rcvJ: safeExcel(row, rcvCol),
        bank: safeExcel(row, bankCol),
        doc: safeExcel(row, docCol),
        install: true,
      },
      ctx.lastRowCtx,
      opTrail
    );
    counters.payments++;
  }

  // اضافه/مانده (LEFTOVER)
  if (LEFTOVER && (LEFTOVER.type || LEFTOVER.amount)) {
    const amt = toNum(safeExcel(row, LEFTOVER.amount));
    if (amt) {
      await addPayment(
        reqFactory,
        {
          saleId: saleIdOrd,
          userId,
          fa: safeExcel(row, LEFTOVER.type),
          amount: amt,
          dueJ: safeExcel(row, LEFTOVER.due),
          rcvJ: safeExcel(row, LEFTOVER.receive),
          bank: safeExcel(row, LEFTOVER.bank),
          doc: safeExcel(row, LEFTOVER.doc),
          install: false,
        },
        ctx.lastRowCtx,
        opTrail
      );
      counters.payments++;
    }
  }

  // REGISTER
  if (REGISTER) {
    const regTotal = toNum(safeExcel(row, REGISTER.amount)) || REGISTER_NOMINAL;
    const tsReg    = parseDateFromCell(row, REGISTER.date) || tsOrd;
    const regId    = 3;

    let saleIdReg = await findExistingRegisterSale(reqFactory, userId, ctx.lastRowCtx, opTrail);
    if (!saleIdReg) {
      saleIdReg = await insertRegisterSale(
        reqFactory,
        { userId, sellerId, regTotal, regId, fn, ln, mob: mobNorm, nat, tsReg },
        ctx.lastRowCtx,
        opTrail
      );
      counters.sales++;

      await insertSaleProjects(
        reqFactory,
        { ts: tsReg, saleId: saleIdReg, regId },
        ctx.lastRowCtx,
        opTrail
      );
      counters.projects++;
    }

    await addPayment(
      reqFactory,
      {
        saleId: saleIdReg,
        userId,
        fa: safeExcel(row, REGISTER.paymentType),
        amount: regTotal,
        dueJ: safeExcel(row, REGISTER.due),
        rcvJ: safeExcel(row, REGISTER.receive),
        bank: safeExcel(row, REGISTER.bank),
        doc: safeExcel(row, REGISTER.doc),
        install: false,
      },
      ctx.lastRowCtx,
      opTrail
    );
    counters.payments++;
  }

  // SaleProducts → دقیقاً با پارامترهای مورد انتظار ریپو
  const warehouseKey = String(safeExcel(row, ORDER.unitPrice) || '').trim(); // ستون S
  const warehouseId  = WAREHOUSE_MAP[warehouseKey] ?? WAREHOUSE_MAP[String(Number(warehouseKey))] ?? null;

  await insertSaleProducts(
    reqFactory,
    {
      saleId: saleIdOrd, // @sale
      ts: tsOrd,         // @ts
      cnt: quantity,     // @cnt  ← از ستون T
      wid: warehouseId,  // @wid  ← از WAREHOUSE_MAP_JSON
    },
    ctx.lastRowCtx,
    opTrail
  );
  counters.products++;

  // SaleSellers
  await insertSaleSeller(
    reqFactory,
    { saleId: saleIdOrd, branchCode: null, branchName: (sellerRaw || null), ts: tsOrd },
    ctx.lastRowCtx,
    opTrail
  );
}

module.exports = { processRow };