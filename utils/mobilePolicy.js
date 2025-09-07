const { MOBILE_PLACEHOLDER_PREFIX = 'TMP-' } = process.env;

function makeMobilePlaceholder(userId, nat) {
  // موبایل 11 رقمیِ «غیرواقعی ولی معتبر» تولید می‌کنیم:
  // 099 + 8 رقم یکتا (از userId یا nat)
  const base = Number.isInteger(userId)
    ? userId
    : parseInt(String(nat || '').replace(/\D/g, ''), 10) || Date.now();
  const suffix = String(100000000 + (base % 100000000)).slice(-8); // 8 digit
  return '099' + suffix; // مثل 09912345678
}

module.exports = { makeMobilePlaceholder };