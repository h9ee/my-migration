// src/repos/usersRepo.js
const { sql } = require('../db/pool');
const { USER_DB } = require('../config/env');
const { execQ } = require('../db/execQ');

async function findUserByNat(reqFactory, nat, rowCtx, opTrail) {
    const req = reqFactory();
    const r = await execQ({
        req, label: 'users.find.byNat',
        sqlText: `SELECT id, user_mobile, user_national_code
              FROM [${USER_DB}].[dbo].[users]
              WHERE user_national_code=@nat`,
        inputs: [{ name: 'nat', type: sql.NVarChar, value: nat }],
        rowCtx, opTrail
    });
    return r.recordset[0] || null;
}

async function findUserByMobile(reqFactory, mobile, rowCtx, opTrail) {
    if (!mobile) return null;
    const req = reqFactory();
    const r = await execQ({
        req, label: 'users.find.byMobile',
        sqlText: `SELECT TOP 1 id, user_mobile, user_national_code
              FROM [${USER_DB}].[dbo].[users]
              WHERE user_mobile=@m`,
        inputs: [{ name: 'm', type: sql.NVarChar, value: mobile }],
        rowCtx, opTrail
    });
    return r.recordset[0] || null;
}

async function isUserNameTaken(reqFactory, name, excludeUserId, rowCtx, opTrail) {
    if (!name) return false;
    const req = reqFactory();
    const r = await execQ({
        req, label: 'users.check.user_name_taken',
        sqlText: `SELECT TOP 1 id
              FROM [${USER_DB}].[dbo].[users]
              WHERE user_name=@n AND (@ex IS NULL OR id<>@ex)`,
        inputs: [
            { name: 'n', type: sql.NVarChar, value: name },
            { name: 'ex', type: sql.Int, value: excludeUserId ?? null },
        ],
        rowCtx, opTrail
    });
    return r.recordset.length > 0;
}

async function insertUser(reqFactory, { mobile, nat, ts }, rowCtx, opTrail) {
    const req = reqFactory();
    const ins = await execQ({
        req, label: 'users.insert',
        sqlText: `INSERT INTO [${USER_DB}].[dbo].[users]
             (user_mobile, user_name, user_national_code, user_status, createdAt, updatedAt)
             OUTPUT INSERTED.id
             VALUES(@m, @n, @nat, 1, @ts, @ts)`,
        inputs: [
            { name: 'm', type: sql.NVarChar, value: mobile },
            { name: 'n', type: sql.NVarChar, value: mobile }, // ← user_name = user_mobile
            { name: 'nat', type: sql.NVarChar, value: nat },
            { name: 'ts', type: sql.DateTimeOffset, value: ts },
        ],
        rowCtx, opTrail
    });
    return ins.recordset[0].id;
}
async function updateUserMobile(reqFactory, { userId, mobile, ts }, rowCtx, opTrail) {
    const req = reqFactory();
    await execQ({
        req, label: 'users.update.mobile',
        sqlText: `UPDATE [${USER_DB}].[dbo].[users]
              SET user_mobile=@m, updatedAt=@ts
              WHERE id=@id`,
        inputs: [
            { name: 'm', type: sql.NVarChar, value: mobile },
            { name: 'ts', type: sql.DateTimeOffset, value: ts },
            { name: 'id', type: sql.Int, value: userId },
        ],
        rowCtx, opTrail
    });
}

async function upsertUserInfo(reqFactory, payload, rowCtx, opTrail) {
  const { userId, fn, ln, fat, shNo, issue, bornRaw, marr, home, ts } = payload;

  // bornRaw = رشته‌ی اکسل مثل "1367-05-27" (جلالی)
  const req1 = reqFactory();
  const ex = await execQ({
    req:req1, label:'user_info.find.byUser',
    sqlText:`SELECT id FROM [${USER_DB}].[dbo].[user_info] WHERE user_id=@uid`,
    inputs:[{ name:'uid', type: sql.Int, value: userId }],
    rowCtx, opTrail
  });

  const inputsCommon = [
    { name:'fn', type: sql.NVarChar, value: fn || null },
    { name:'ln', type: sql.NVarChar, value: ln || null },
    { name:'fat', type: sql.NVarChar, value: fat || null },
    { name:'shno', type: sql.NVarChar, value: shNo || null },
    { name:'issue', type: sql.NVarChar, value: issue || null },
    { name:'born', type: sql.NVarChar, value: bornRaw || null }, // ← STRING
    { name:'marr', type: sql.NVarChar, value: marr || null },
    { name:'home', type: sql.NVarChar, value: home || null },
    { name:'ts', type: sql.DateTimeOffset, value: ts },
  ];

  if (ex.recordset.length) {
    const req = reqFactory();
    await execQ({
      req, label:'user_info.update',
      sqlText:`UPDATE [${USER_DB}].[dbo].[user_info]
               SET user_info_first_name=@fn,
                   user_info_last_name=@ln,
                   user_info_father_name=@fat,
                   user_info_number_bc=@shno,
                   user_info_place_of_issue=@issue,
                   user_info_birthday=@born,
                   user_info_marital_status=@marr,
                   user_info_home_phone=@home,
                   user_info_phone=@home,
                   updatedAt=@ts
               WHERE user_id=@uid`,
      inputs:[...inputsCommon, { name:'uid', type: sql.Int, value: userId }],
      rowCtx, opTrail
    });
  } else {
    const req = reqFactory();
    await execQ({
      req, label:'user_info.insert',
      sqlText:`INSERT INTO [${USER_DB}].[dbo].[user_info]
               (user_id, user_info_first_name, user_info_last_name, user_info_father_name,
                user_info_number_bc, user_info_place_of_issue, user_info_birthday,
                user_info_marital_status, user_info_home_phone, user_info_phone,
                user_info_verify, user_info_status, createdAt, updatedAt)
               VALUES
               (@uid, @fn, @ln, @fat, @shno, @issue, @born, @marr, @home, @home, 0, 1, @ts, @ts)`,
      inputs:[{ name:'uid', type: sql.Int, value: userId }, ...inputsCommon],
      rowCtx, opTrail
    });
  }
}


module.exports = {
    findUserByNat,
    findUserByMobile,
    isUserNameTaken,
    insertUser,
    updateUserMobile,
    upsertUserInfo,
};
