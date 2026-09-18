function findRate(rates = [], base, quote, rateDate = new Date()) {
  const from = String(base || "").toUpperCase();
  const to = String(quote || "").toUpperCase();
  if (!from || !to) return null;
  if (from === to) {
    return { base: from, quote: to, rate: 1, bufferPct: 0, riskAdjustmentPct: 0, rateDate };
  }
  const asOf = new Date(rateDate);
  const match = rates
    .filter((item) => item.base === from && item.quote === to && new Date(item.rateDate) <= asOf)
    .sort((a, b) => new Date(b.rateDate) - new Date(a.rateDate))[0];
  if (match) return match;
  const inverse = rates
    .filter((item) => item.base === to && item.quote === from && new Date(item.rateDate) <= asOf)
    .sort((a, b) => new Date(b.rateDate) - new Date(a.rateDate))[0];
  if (!inverse || !inverse.rate) return null;
  return {
    ...inverse,
    base: from,
    quote: to,
    rate: 1 / Number(inverse.rate),
    inverted: true,
  };
}

function adjustedRate(rateDoc) {
  if (!rateDoc) return null;
  const rate = Number(rateDoc.rate || 0);
  const buffer = Number(rateDoc.bufferPct || 0) / 100;
  const risk = Number(rateDoc.riskAdjustmentPct || 0) / 100;
  return rate * (1 + buffer) * (1 + risk);
}

function convertAmount(amount, from, to, rates, rateDate) {
  const value = Number(amount || 0);
  if (!value) return 0;
  const rateDoc = findRate(rates, from, to, rateDate);
  if (!rateDoc) return value;
  return value * adjustedRate(rateDoc);
}

module.exports = { findRate, adjustedRate, convertAmount };
