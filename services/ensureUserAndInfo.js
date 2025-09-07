// src/services/ensureUserAndInfo.js
const { excelCell } = require('../utils/excel');
const { toEnDigits, normalizeMobile, nat10 } = require('../utils/digits');
const { normalizeMarital } = require('../utils/marital');
const { normalizeJalaliYYYYMMDD } = require('../utils/jdate');

const {
  findUserByNat,
  findUserByMobile,
  insertUser,
  updateUserMobile,
  upsertUserInfo,
} = require('../repos/usersRepo');

const { USERS_COLS } = require('../config/columns');

/**
 * تضمین ایجاد/به‌روزرسانی کاربر و user_info
 * - موبایل باید حتماً معتبر (۱۱ رقمی با 0) باشد
 * - user_name = user_mobile
 * - تاریخ تولد به صورت رشتهٔ شمسی YYYY-MM-DD ذخیره می‌شود
 * - وضعیت تاهل به "single" | "married" نرمال می‌شود
 * - در تعارض موبایل، طبق MOBILE_CONFLICT_STRATEGY عمل می‌شود
 */
async function ensureUserAndInfo(reqFactory, row, rowCtx, opTrail) {
  const strategy = (process.env.MOBILE_CONFLICT_STRATEGY || 'reassign_with_placeholder').toLowerCase();

  // خواندن از اکسل بر اساس ENV
  const fnRaw    = (excelCell(row, USERS_COLS.firstName) || '').trim();
  const lnRaw    = (excelCell(row, USERS_COLS.lastName)  || '').trim();
  const fatRaw   = (excelCell(row, USERS_COLS.father)    || '').trim();
  const natRaw   = (excelCell(row, USERS_COLS.national)  || '').trim();
  const idNoRaw  = (excelCell(row, USERS_COLS.idNumber)  || '').trim();
  const bornIn   = (excelCell(row, USERS_COLS.birthday)  || '').trim(); // شمسی وارد شده
  const issueRaw = (excelCell(row, USERS_COLS.issuePlace)|| '').trim();
  const marrIn   = (excelCell(row, USERS_COLS.marital)   || '').trim();
  const mobIn    = (excelCell(row, USERS_COLS.mobile)    || '').trim();
  const homeIn   = (excelCell(row, USERS_COLS.phone)     || '').trim();

  // نرمال‌سازی
  const fn      = fnRaw;
  const ln      = lnRaw;
  const fat     = fatRaw;
  const nat     = nat10(toEnDigits(natRaw));          // دقیقاً 10 رقمی
  const shNo    = toEnDigits(idNoRaw);
  const bornRaw = normalizeJalaliYYYYMMDD(bornIn);    // YYYY-MM-DD یا null (STRING)
  const issue   = issueRaw;
  const marr    = normalizeMarital(marrIn);           // "single" | "married" | null
  const mobNorm = normalizeMobile(mobIn);             // 11 رقمی با 0
  const home    = toEnDigits(homeIn);

  const ts = new Date();

  // اعتبارسنجی‌های سخت‌گیرانه
  if (!nat || nat.length !== 10) {
    const err = new Error(`invalid national code: '${natRaw}'`);
    err._skip_row = true;
    err._reason = 'invalid_national_code';
    throw err;
  }
  if (!mobNorm) {
    const err = new Error(`invalid or empty mobile for nat=${nat}`);
    err._skip_row = true;
    err._reason = 'invalid_mobile';
    throw err;
  }

  // پیدا کردن کاربر با کدملی (source of truth)
  let user = await findUserByNat(reqFactory, nat, rowCtx, opTrail);

  if (user) {
    // اگر موبایل تغییر کرده، تعارض را مدیریت کن
    const currentMobile = (user.user_mobile || '').trim();
    if (currentMobile !== mobNorm) {
      const holder = await findUserByMobile(reqFactory, mobNorm, rowCtx, opTrail);
      if (!holder) {
        await updateUserMobile(reqFactory, { userId: user.id, mobile: mobNorm, ts }, rowCtx, opTrail);
      } else if (holder.id !== user.id) {
        if (strategy === 'reassign_with_placeholder') {
          // موبایلِ کاربرِ دیگر را به پلا‌یس‌هولدر تغییر بده و به این کاربر بده
          const ph = `TMP${String(holder.user_national_code || '').padStart(10,'0')}`.slice(0,11).padEnd(11,'0');
          await updateUserMobile(reqFactory, { userId: holder.id, mobile: ph,  ts }, rowCtx, opTrail);
          await updateUserMobile(reqFactory, { userId: user.id,  mobile: mobNorm, ts }, rowCtx, opTrail);
          console.log(`   🔁 mobile reassigned: holder#${holder.id} -> '${ph}', nat#${nat} -> '${mobNorm}'`);
        } else {
          const err = new Error(`mobile '${mobNorm}' belongs to another user(id=${holder.id}) → skip`);
          err._skip_row = true;
          err._reason = 'mobile_taken';
          throw err;
        }
      }
    }
    // user_name کاربر موجود را دست نمی‌زنیم
  } else {
    // اگر موبایل متعلق به دیگری است، طبق policy
    const holder = await findUserByMobile(reqFactory, mobNorm, rowCtx, opTrail);
    if (holder) {
      if (strategy === 'reassign_with_placeholder') {
        const ph = `TMP${String(holder.user_national_code || '').padStart(10,'0')}`.slice(0,11).padEnd(11,'0');
        await updateUserMobile(reqFactory, { userId: holder.id, mobile: ph, ts }, rowCtx, opTrail);
        console.log(`   🔁 mobile freed from user#${holder.id} -> '${ph}'`);
      } else {
        const err = new Error(`mobile '${mobNorm}' belongs to another user(id=${holder.id}) → skip`);
        err._skip_row = true;
        err._reason = 'mobile_taken';
        throw err;
      }
    }

    // ساخت کاربر جدید: user_name = user_mobile
    const newUserId = await insertUser(
      reqFactory,
      { mobile: mobNorm, name: mobNorm, nat, ts },
      rowCtx,
      opTrail
    );
    user = { id: newUserId, user_national_code: nat, user_mobile: mobNorm };
    console.log(`   ✅ users inserted → id=${newUserId}, mobile='${mobNorm}', user_name='${mobNorm}'`);
  }

  // upsert روی user_info (تولد STRING شمسی + verify=false در repo)
  await upsertUserInfo(
    reqFactory,
    { userId: user.id, fn, ln, fat, shNo, issue, bornRaw, marr, home, ts },
    rowCtx,
    opTrail
  );

  return { userId: user.id, nat, mob: mobNorm };
}

module.exports = { ensureUserAndInfo };
