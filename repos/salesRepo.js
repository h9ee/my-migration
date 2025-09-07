// src/repos/salesRepo.js
const { sql } = require('../db/pool');
const { USER_DB, PROJECT_DB } = require('../config/env');
const { execQ } = require('../db/execQ');
const { normalizeMobile } = require('../utils/digits');

async function insertSaleSeller(reqFactory, payload, rowCtx, opTrail) {
  const { saleId, branchCode, branchName, ts } = payload;
  const req = reqFactory();
  await execQ({
    req,
    label: 'saleSellers.insert',
    sqlText: `INSERT INTO [${PROJECT_DB}].[dbo].[SaleSellers]
      (user_id, sale_seller_call_center_id, sale_seller_call_center_first_name,
       sale_seller_call_center_last_name, sale_seller_call_center_create,
       sale_seller_presenter_id, sale_seller_presenter_first_name, sale_seller_presenter_last_name,
       sale_seller_presenter_create, sale_seller_contractor_id, sale_seller_contractor_first_name,
       sale_seller_contractor_last_name, sale_seller_contractor_create,
       sale_seller_branch_code, sale_seller_branch_name, sale_seller_branch_id,
       sale_seller_status, createdAt, updatedAt, sale_id)
     VALUES
      (NULL, NULL, NULL, NULL, NULL,
       NULL, NULL, NULL, NULL, NULL, NULL,
       NULL, NULL,
       @code, @name, NULL,
       NULL, @ts, @ts, @sale)`,
    inputs: [
      { name: 'code', type: sql.NVarChar, value: (branchCode != null ? String(branchCode) : null) },
      { name: 'name', type: sql.NVarChar, value: branchName || null },
      { name: 'ts',   type: sql.DateTimeOffset, value: ts instanceof Date ? ts : new Date(ts) },
      { name: 'sale', type: sql.Int, value: saleId },
    ],
    rowCtx, opTrail
  });
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
           @tot,N'order',@fn,@ln,
           @mob,@nat,@stat,@ts,@ts)`,
    inputs: [
      { name: 'pid', type: sql.Int, value: 1 },
      { name: 'uid', type: sql.Int, value: userId },
      { name: 'reg', type: sql.Int, value: 3 },
      { name: 'sid', type: sql.Int, value: sellerId },
      { name: 'tot', type: sql.NVarChar, value: String(ordTotal) },
      { name: 'fn',  type: sql.NVarChar, value: fn || null },
      { name: 'ln',  type: sql.NVarChar, value: ln || null },
      { name: 'mob', type: sql.NVarChar, value: mobNorm || null }, // ✅
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
           @tot,N'register',@fn,@ln,
           @mob,@nat,16,@ts,@ts)`,
    inputs: [
      { name: 'pid', type: sql.Int, value: 1 },
      { name: 'uid', type: sql.Int, value: userId },
      { name: 'reg', type: sql.Int, value: regId },
      { name: 'sid', type: sql.Int, value: sellerId },
      { name: 'tot', type: sql.NVarChar, value: String(regTotal) },
      { name: 'fn',  type: sql.NVarChar, value: fn || null },
      { name: 'ln',  type: sql.NVarChar, value: ln || null },
      { name: 'mob', type: sql.NVarChar, value: mobNorm || null }, // ✅
      { name: 'nat', type: sql.NVarChar, value: nat || null },
      { name: 'ts',  type: sql.DateTimeOffset, value: tsReg instanceof Date ? tsReg : new Date(tsReg) },
    ],
    rowCtx, opTrail
  });
  return r.recordset[0].id;
}

async function findExistingRegisterSale(reqFactory, userId, rowCtx, opTrail) {
  const req = reqFactory();
  const r = await execQ({
    req,
    label: 'sales.findExisting.register',
    sqlText: `SELECT TOP 1 id
          FROM dbo.Sales
          WHERE user_id=@uid AND sale_type=N'register'
          ORDER BY createdAt DESC`,
    inputs: [{ name: 'uid', type: sql.Int, value: userId }],
    rowCtx, opTrail
  });
  return r.recordset[0]?.id || null;
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
          (@name,1,N'سهم',1,1,1,1,@regid,1,@ts,@ts,@sale,@coop)`,
    inputs: [
      { name: 'name', type: sql.NVarChar, value: 'هتل ۵ ستاره مرکوری کیش' },
      { name: 'regid', type: sql.Int, value: regId },
      { name: 'ts',   type: sql.DateTimeOffset, value: ts instanceof Date ? ts : new Date(ts) },
      { name: 'sale', type: sql.Int, value: saleId },
      { name: 'coop', type: sql.NVarChar, value: 'شرکت تعاونی ستایش ماندگار آفرینش' },
    ],
    rowCtx, opTrail
  });
}

async function insertSaleProducts(reqFactory, payload, rowCtx, opTrail) {
  const { cnt, wid, saleId, ts } = payload;

  // گارد برای جلوگیری از NULL
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
          (@cnt,@wid,1,NULL,1,@ts,@ts,@sale)`,
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
