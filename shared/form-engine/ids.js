function createId(prefix = "id") {
  const rand = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}_${time}${rand}`;
}

function toFieldKey(label, fallback = "field") {
  const key = String(label || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return key || fallback;
}

function uniqueKey(base, existingKeys) {
  const used = existingKeys instanceof Set ? existingKeys : new Set(existingKeys || []);
  let key = base || "field";
  let index = 2;
  while (used.has(key)) {
    key = `${base}_${index}`;
    index += 1;
  }
  return key;
}

function nextVersionLabel(current) {
  if (!current) return "1.0";
  const parts = String(current).split(".");
  const major = Number.parseInt(parts[0], 10);
  const minor = Number.parseInt(parts[1], 10);
  if (Number.isNaN(major) || Number.isNaN(minor)) return "1.0";
  return `${major}.${minor + 1}`;
}

module.exports = { createId, toFieldKey, uniqueKey, nextVersionLabel };
