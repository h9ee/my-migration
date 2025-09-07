// src/utils/envJson.js
function relaxJson(raw) {
  if (!raw || typeof raw !== 'string') return raw;
  let s = raw.trim();

  // If wrapped in single quotes by .env, strip the outer quotes
  // e.g. '{a:1}' or '[1,2]' might also be wrapped like:  '{...}'
  if (s.startsWith("'") && s.endsWith("'")) s = s.slice(1, -1);
  if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1);

  // If it already looks like JSON object/array, try to make it stricter:
  if (s.startsWith('{') || s.startsWith('[')) {
    // Quote unquoted keys in objects: foo: 1  -> "foo": 1
    s = s.replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/g, '$1"$2"$3');
    // Remove trailing commas inside objects/arrays
    s = s.replace(/,\s*(?=[}\]])/g, '');
    return s;
  }

  // Otherwise, it might be a JSON-shaped string that lost quotes. Return as-is.
  return s;
}

function readJsonEnv(name, defVal = undefined) {
  const raw = process.env[name];
  if (raw == null || raw === '') return defVal;

  try {
    return JSON.parse(raw);
  } catch (e1) {
    // 2nd attempt with relaxed normalization
    const relaxed = relaxJson(raw);
    try {
      return JSON.parse(relaxed);
    } catch (e2) {
      const msg = [
        `Invalid JSON in env ${name}.`,
        `Got: ${raw}`,
        `Relaxed: ${relaxed}`,
        `Error: ${e2.message}`
      ].join('\n');
      throw new Error(msg);
    }
  }
}

module.exports = { readJsonEnv, relaxJson };
