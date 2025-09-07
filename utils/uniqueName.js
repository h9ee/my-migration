function baseName(fn, ln) {
  return `${(fn || '').trim()} ${(ln || '').trim()}`.trim();
}

function makeNameWithNat(fn, ln, nat, fullNat = false) {
  const b = baseName(fn, ln) || String(nat);
  const tail = fullNat ? String(nat) : String(nat || '').slice(-4);
  return `${b} · ${tail}`;
}

function makeNameWithSuffix(str, suffix) {
  const s = (str || '').trim();
  return s ? `${s} · ${suffix}` : `${suffix}`;
}

module.exports = { baseName, makeNameWithNat, makeNameWithSuffix };