const { sql } = require('../db/pool');
const { USER_DB } = require('../config/env');
const { execQ } = require('../db/execQ');
const { DEFAULT_SELLER_ID } = require('../config/env');
const { toEnDigits } = require('../utils/digits');

async function resolveSellerId(reqFactory, raw, rowCtx, opTrail) {
  const val = toEnDigits((raw ?? '').toString().trim());
  if (!val) return DEFAULT_SELLER_ID;

  if (/^\d+$/.test(val)) {
    const idNum = parseInt(val, 10);
    const req = reqFactory();
    const r = await execQ({
      req, label:'seller.check.byId',
      sqlText:`SELECT id FROM [${USER_DB}].[dbo].[sellers] WHERE id=@id`,
      inputs:[{ name:'id', type: sql.Int, value: idNum }],
      rowCtx, opTrail
    });
    return r.recordset.length ? idNum : DEFAULT_SELLER_ID;
  }

  const name = val.trim();
  let req = reqFactory();
  let r = await execQ({
    req, label:'seller.find.byName',
    sqlText:`SELECT id FROM [${USER_DB}].[dbo].[sellers] WHERE user_seller_name=@n`,
    inputs:[{ name:'n', type: sql.NVarChar, value: name }],
    rowCtx, opTrail
  });
  if (r.recordset.length) return r.recordset[0].id;

  req = reqFactory();
  const i = await execQ({
    req, label:'seller.insert.byName',
    sqlText:`INSERT INTO [${USER_DB}].[dbo].[sellers]
             (user_seller_name,user_seller_status,createdAt,updatedAt)
             OUTPUT INSERTED.id
             VALUES(@n,1,SYSDATETIMEOFFSET(),SYSDATETIMEOFFSET())`,
    inputs:[{ name:'n', type: sql.NVarChar, value: name }],
    rowCtx, opTrail
  });
  return i.recordset[0].id;
}

module.exports = { resolveSellerId };
