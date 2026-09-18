function money(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function normalizeState(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function taxSplitFor(companyState, buyerState) {
  const company = normalizeState(companyState);
  const buyer = normalizeState(buyerState);
  if (!company || !buyer) return "intra";
  return company === buyer ? "intra" : "inter";
}

function splitTax(taxable, rate, split) {
  const amount = money(taxable);
  const pct = Number(rate) || 0;
  if (pct <= 0 || amount <= 0) return { cgst: 0, sgst: 0, igst: 0, tax: 0 };
  if (split === "inter") {
    const igst = money(amount * (pct / 100));
    return { cgst: 0, sgst: 0, igst, tax: igst };
  }
  const halfRate = pct / 2;
  const cgst = money(amount * (halfRate / 100));
  const sgst = money(amount * (halfRate / 100));
  return { cgst, sgst, igst: 0, tax: money(cgst + sgst) };
}

function computeLine(line = {}, { split = "intra", taxRate = null } = {}) {
  const quantity = Number(line.quantity) || 0;
  const unitPrice = Number(line.unitPrice) || 0;
  const discount = Number(line.discount) || 0;
  const taxableAmount = money(Math.max(0, quantity * unitPrice - discount));
  const rate = taxRate && taxRate.rate != null ? Number(taxRate.rate) : Number(line.taxRate) || 0;
  const parts = splitTax(taxableAmount, rate, split);
  return {
    offeringId: line.offeringId || null,
    documentKey: line.documentKey || "",
    formDefinitionId: line.formDefinitionId || null,
    description: line.description || "",
    hsnSac: line.hsnSac || "",
    quantity,
    unitPrice: money(unitPrice),
    discount: money(discount),
    taxRateId: taxRate?._id || line.taxRateId || null,
    taxRate: rate,
    taxName: taxRate?.name || line.taxName || "",
    taxableAmount,
    cgst: parts.cgst,
    sgst: parts.sgst,
    igst: parts.igst,
    taxAmount: parts.tax,
    lineTotal: money(taxableAmount + parts.tax),
  };
}

function computeTotals(lines = [], headerDiscount = 0) {
  const taxableAmount = money(lines.reduce((sum, line) => sum + (line.taxableAmount || 0), 0));
  const cgst = money(lines.reduce((sum, line) => sum + (line.cgst || 0), 0));
  const sgst = money(lines.reduce((sum, line) => sum + (line.sgst || 0), 0));
  const igst = money(lines.reduce((sum, line) => sum + (line.igst || 0), 0));
  const taxAmount = money(cgst + sgst + igst);
  const discount = money(headerDiscount);
  const grandTotal = money(Math.max(0, taxableAmount + taxAmount - discount));
  return { taxableAmount, cgst, sgst, igst, taxAmount, discount, grandTotal };
}

function amountDue(invoice) {
  return money(Math.max(0, (invoice.grandTotal || 0) - (invoice.amountPaid || 0) - (invoice.amountCredited || 0)));
}

module.exports = { money, taxSplitFor, splitTax, computeLine, computeTotals, amountDue };
