const { convertAmount } = require("./fx.engine");

function includedSet(incoterm) {
  return new Set((incoterm?.costComponentCodes || []).map((code) => String(code)));
}

function normalizeLines(lines = [], components = []) {
  const names = Object.fromEntries(components.map((item) => [item.code, item.name]));
  return lines.map((line) => {
    const code = String(line.componentCode || line.code || "");
    return {
      componentCode: code,
      name: line.name || line.nameSnapshot || names[code] || code,
      amount: Number(line.amount || 0),
      currency: String(line.currency || "INR").toUpperCase(),
      notes: line.notes || "",
    };
  });
}

function calculateLandedCost({
  lines = [],
  incoterm,
  sellingPrice = 0,
  viewCurrency = "INR",
  rates = [],
  rateDate = new Date(),
  components = [],
}) {
  const included = includedSet(incoterm);
  const normalized = normalizeLines(lines, components);
  const priced = normalized.map((line) => {
    const converted = convertAmount(line.amount, line.currency, viewCurrency, rates, rateDate);
    const isIncluded = included.size ? included.has(line.componentCode) : true;
    return {
      ...line,
      convertedAmount: Math.round(converted * 100) / 100,
      included: isIncluded,
    };
  });

  const landedCost = Math.round(priced.filter((line) => line.included).reduce((sum, line) => sum + line.convertedAmount, 0) * 100) / 100;
  const price = Number(sellingPrice || 0);
  const grossProfit = Math.round((price - landedCost) * 100) / 100;
  const grossMarginPct = price ? Math.round((grossProfit / price) * 10000) / 100 : null;

  return {
    currency: viewCurrency,
    incotermCode: incoterm?.code || "",
    lines: priced,
    landedCost,
    sellingPrice: price,
    grossProfit,
    grossMarginPct,
  };
}

module.exports = { calculateLandedCost, includedSet, normalizeLines };
