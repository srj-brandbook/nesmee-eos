export function money(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function normalizeState(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function taxSplitFor(companyState, buyerState) {
  const company = normalizeState(companyState);
  const buyer = normalizeState(buyerState);
  if (!company || !buyer) return "intra";
  return company === buyer ? "intra" : "inter";
}

export function splitTax(taxable, rate, split) {
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

export function computeLine(line = {}, { split = "intra", taxRate = null } = {}) {
  const quantity = Number(line.quantity) || 0;
  const unitPrice = Number(line.unitPrice) || 0;
  const discount = Number(line.discount) || 0;
  const taxableAmount = money(Math.max(0, quantity * unitPrice - discount));
  const rate = taxRate && taxRate.rate != null ? Number(taxRate.rate) : Number(line.taxRate) || 0;
  const parts = splitTax(taxableAmount, rate, split);
  return {
    ...line,
    quantity,
    unitPrice: money(unitPrice),
    discount: money(discount),
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

export function computeTotals(lines = [], headerDiscount = 0) {
  const taxableAmount = money(lines.reduce((sum, line) => sum + (line.taxableAmount || 0), 0));
  const cgst = money(lines.reduce((sum, line) => sum + (line.cgst || 0), 0));
  const sgst = money(lines.reduce((sum, line) => sum + (line.sgst || 0), 0));
  const igst = money(lines.reduce((sum, line) => sum + (line.igst || 0), 0));
  const taxAmount = money(cgst + sgst + igst);
  const discount = money(headerDiscount);
  const grandTotal = money(Math.max(0, taxableAmount + taxAmount - discount));
  return { taxableAmount, cgst, sgst, igst, taxAmount, discount, grandTotal };
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(value) {
  const n = Number(value) || 0;
  if (n < 20) return ONES[n];
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return `${TENS[ten]}${one ? ` ${ONES[one]}` : ""}`.trim();
}

function threeDigits(value) {
  const n = Number(value) || 0;
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  const parts = [];
  if (hundred) parts.push(`${ONES[hundred]} Hundred`);
  if (rest) parts.push(twoDigits(rest));
  return parts.join(" ");
}

export function amountInWords(value) {
  const amount = money(value);
  if (amount <= 0) return "Zero Rupees Only";
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const hundred = rupees % 1000;
  const parts = [];
  if (crore) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));
  let words = parts.length ? `${parts.join(" ")} Rupees` : "Zero Rupees";
  if (paise) words += ` and ${twoDigits(paise)} Paise`;
  return `${words} Only`;
}

export function addDaysIso(days, from = new Date()) {
  const date = new Date(from);
  date.setDate(date.getDate() + (Number(days) || 0));
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isoDate(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function emptyInvoiceLine() {
  return {
    offeringId: "",
    description: "",
    hsnSac: "9983",
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    taxRateId: "",
    documentKey: "",
  };
}
