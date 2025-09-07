// src/repos/salesRepo.js
const { sql } = require('../db/pool');
const { USER_DB, PROJECT_DB } = require('../config/env');
const { execQ } = require('../db/execQ');
const { normalizeMobile } = require('../utils/digits');
const { PROJECT_DEFAULTS, SALE_DEFAULTS, PRODUCT_DEFAULTS } = require('../consts/maps');

async function insertSaleSeller(reqFactory, payload, rowCtx, opTrail) {
  // ... (این تابع تغییری نکرده است)
}

async function insertOrderSale(reqFactory, payload, rowCtx, opTrail) {
  const { userId, sellerId, ordTotal, fn, ln, mob, nat, ordStatus, tsOrd } = payload;
  const req = reqFactory();
  const mobNorm = normalizeMobile(mob || null);

  const r = await execQ({
    req,
    label: 'sales.insert.order',
    sqlText: `INSERT INTO dbo.Sales
          (project_id,user_id,register_id,seller_id,
           sale_total_price,sale_type,sale_first_name,sale_last_name,
           sale_mobile,sale_national_code,sale_status,createdAt,updatedAt)
          OUTPUT INSERTED.id
          VALUES
          (@pid,@uid,@reg,@sid,
           @tot,N'${SALE_DEFAULTS.TYPE_ORDER}',@fn,@ln,
           @mob,@nat,@stat,@ts,@ts)`,
    inputs: [
      { name: 'pid', type: sql.Int, value: PROJECT_DEFAULTS.ID },
      { name: 'uid', type: sql.Int, value: userId },
      { name: 'reg', type: sql.Int, value: PROJECT_DEFAULTS.REGISTER_ID },
      { name: 'sid', type: sql.Int, value: sellerId },
      { name: 'tot', type: sql.NVarChar, value: String(ordTotal) },
      { name: 'fn',  type: sql.NVarChar, value: fn || null },
      { name: 'ln',  type: sql.NVarChar, value: ln || null },
      { name: 'mob', type: sql.NVarChar, value: mobNorm || null },
      { name: 'nat', type: sql.NVarChar, value: nat || null },
      { name: 'stat', type: sql.Int, value: ordStatus },
      { name: 'ts',  type: sql.DateTimeOffset, value: tsOrd instanceof Date ? tsOrd : new Date(tsOrd) },
    ],
    rowCtx, opTrail
  });
  return r.recordset[0].id;
}

async function insertRegisterSale(reqFactory, payload, rowCtx, opTrail) {
  const { userId, sellerId, regTotal, regId, fn, ln, mob, nat, tsReg } = payload;
  const mobNorm = normalizeMobile(mob || null);

  const req = reqFactory();
  const r = await execQ({
    req,
    label: 'sales.insert.register',
    sqlText: `INSERT INTO dbo.Sales
          (project_id,user_id,register_id,seller_id,
           sale_total_price,sale_type,sale_first_name,sale_last_name,
           sale_mobile,sale_national_code,sale_status,createdAt,updatedAt)
          OUTPUT INSERTED.id
          VALUES
          (@pid,@uid,@reg,@sid,
           @tot,N'${SALE_DEFAULTS.TYPE_REGISTER}',@fn,@ln,
           @mob,@nat,${SALE_DEFAULTS.STATUS_REGISTER},@ts,@ts)`,
    inputs: [
      { name: 'pid', type: sql.Int, value: PROJECT_DEFAULTS.ID },
      { name: 'uid', type: sql.Int, value: userId },
      { name: 'reg', type: sql.Int, value: regId },
      { name: 'sid', type: sql.Int, value: sellerId },
      { name: 'tot', type: sql.NVarChar, value: String(regTotal) },
      { name: 'fn',  type: sql.NVarChar, value: fn || null },
      { name: 'ln',  type: sql.NVarChar, value: ln || null },
      { name: 'mob', type: sql.NVarChar, value: mobNorm || null },
      { name: 'nat', type: sql.NVarChar, value: nat || null },
      { name: 'ts',  type: sql.DateTimeOffset, value: tsReg instanceof Date ? tsReg : new Date(tsReg) },
    ],
    rowCtx, opTrail
  });
  return r.recordset[0].id;
}

async function findExistingRegisterSale(reqFactory, userId, rowCtx, opTrail) {
    // ... (این تابع تغییری نکرده است)
}

async function insertSaleProjects(reqFactory, payload, rowCtx, opTrail) {
  const { ts, saleId, regId } = payload;
  const req = reqFactory();
  await execQ({
    req,
    label: 'saleProjects.insert',
    sqlText: `INSERT INTO [${PROJECT_DB}].[dbo].[SaleProjects]
          (sale_project_name,sale_project_creator,sale_project_type,
           sale_project_cooperative_id,sale_project_estate_id,sale_project_category_id,
           sale_project_bank_id,sale_project_register_id,sale_project_status,
           createdAt,updatedAt,sale_id,sale_project_cooperative_name)
          VALUES
          (@name,@creator,@type,@coopId,@estateId,@catId,@bankId,@regid,@status,@ts,@ts,@sale,@coopName)`,
    inputs: [
      { name: 'name', type: sql.NVarChar, value: PROJECT_DEFAULTS.NAME },
      { name: 'creator', type: sql.Int, value: PROJECT_DEFAULTS.CREATOR_ID },
      { name: 'type', type: sql.NVarChar, value: PROJECT_DEFAULTS.TYPE },
      { name: 'coopId', type: sql.Int, value: PROJECT_DEFAULTS.COOPERATIVE_ID },
      { name: 'estateId', type: sql.Int, value: PROJECT_DEFAULTS.ESTATE_ID },
      { name: 'catId', type: sql.Int, value: PROJECT_DEFAULTS.CATEGORY_ID },
      { name: 'bankId', type: sql.Int, value: PROJECT_DEFAULTS.BANK_ID },
      { name: 'regid', type: sql.Int, value: regId },
      { name: 'status', type: sql.Int, value: PROJECT_DEFAULTS.STATUS },
      { name: 'ts',   type: sql.DateTimeOffset, value: ts instanceof Date ? ts : new Date(ts) },
      { name: 'sale', type: sql.Int, value: saleId },
      { name: 'coopName', type: sql.NVarChar, value: PROJECT_DEFAULTS.COOPERATIVE_NAME },
    ],
    rowCtx, opTrail
  });
}

async function insertSaleProducts(reqFactory, payload, rowCtx, opTrail) {
  const { cnt, wid, saleId, ts } = payload;

  if (!Number.isFinite(cnt) || cnt <= 0) {
    const err = new Error(`Invalid cnt (sale_product_count): ${cnt}`);
    err._skip_row = true;
    err._reason = 'invalid_count';
    throw err;
  }

  const req = reqFactory();
  await execQ({
    req,
    label: 'saleProducts.insert',
    sqlText: `INSERT INTO [${PROJECT_DB}].[dbo].[SaleProducts]
          (sale_product_count,warehouse_id,product_id,product_multiple_id,
           sale_product_status,createdAt,updatedAt,sale_id)
          VALUES
          (@cnt,@wid,${PRODUCT_DEFAULTS.ID},NULL,${PRODUCT_DEFAULTS.STATUS},@ts,@ts,@sale)`,
    inputs: [
      { name: 'cnt',  type: sql.Int, value: cnt },
      { name: 'wid',  type: sql.Int, value: wid ?? null },
      { name: 'ts',   type: sql.DateTimeOffset, value: ts instanceof Date ? ts : new Date(ts) },
      { name: 'sale', type: sql.Int, value: saleId },
    ],
    rowCtx, opTrail
  });
}

module.exports = {
  insertOrderSale,
  insertRegisterSale,
  findExistingRegisterSale,
  insertSaleProjects,
  insertSaleProducts,
  insertSaleSeller
};