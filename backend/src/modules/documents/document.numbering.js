const DocumentCounter = require("../../models/DocumentCounter");
const { TYPE_PREFIXES } = require("../../constants/documents");

async function nextDocNumber(type) {
  const prefix = TYPE_PREFIXES[type] || TYPE_PREFIXES.custom;
  const year = new Date().getFullYear();
  const counter = await DocumentCounter.findOneAndUpdate(
    { prefix, year },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const seq = Number(counter.seq) || 1;
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}

module.exports = { nextDocNumber };
