const { VARIABLE_MAP, catalogForSubject, TYPE_LABELS } = require("../../constants/documents");

const TOKEN = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

function formatDate(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part) => String(part).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function pick(source = {}, keys) {
  const out = {};
  keys.forEach((key) => {
    out[key] = source[key] == null ? "" : source[key];
  });
  return out;
}

function companyFromSettings(settings = {}) {
  return {
    name: settings.name || "",
    legalName: settings.legalName || settings.name || "",
    supportEmail: settings.supportEmail || "",
    address: settings.address || "",
    city: settings.city || "",
    state: settings.state || "",
    pincode: settings.pincode || "",
    country: settings.country || "",
    gstin: settings.gstin || "",
    logoUrl: settings.logoUrl || "",
    signatoryName: settings.signatoryName || "",
    signatoryTitle: settings.signatoryTitle || "",
  };
}

function flattenBindings({ supplier = {}, buyer = {}, company = {}, issuer = {}, doc = {}, today = "" }) {
  const values = {};
  Object.entries(supplier).forEach(([key, value]) => {
    values[`supplier.${key}`] = value == null ? "" : String(value);
  });
  Object.entries(buyer).forEach(([key, value]) => {
    values[`buyer.${key}`] = value == null ? "" : String(value);
  });
  Object.entries(company).forEach(([key, value]) => {
    values[`company.${key}`] = value == null ? "" : String(value);
  });
  Object.entries(issuer).forEach(([key, value]) => {
    values[`issuer.${key}`] = value == null ? "" : String(value);
  });
  Object.entries(doc).forEach(([key, value]) => {
    values[`doc.${key}`] = value == null ? "" : String(value);
  });
  values.today = today || "";
  return values;
}

function buildContext({ subjectType, subject, settings, actor, docMeta = {} }) {
  const company = companyFromSettings(settings);
  const issuer = { name: actor?.name || "", email: actor?.email || "" };
  const today = formatDate(new Date());
  const supplier =
    subjectType === "lead"
      ? pick(subject || {}, [
          "name",
          "legalName",
          "email",
          "phone",
          "website",
          "country",
          "city",
          "gstin",
          "billingState",
          "billingAddress",
          "pincode",
          "products",
          "certifications",
          "moq",
          "exportMarkets",
        ])
      : {};
  const buyer =
    subjectType === "buyer"
      ? pick(subject || {}, ["name", "legalName", "email", "phone", "country", "city", "segment", "productInterest"])
      : {};
  const doc = {
    number: docMeta.number || "",
    title: docMeta.title || "",
    type: TYPE_LABELS[docMeta.type] || docMeta.type || "",
    issuedAt: docMeta.issuedAt ? formatDate(docMeta.issuedAt) : "",
  };
  const values = flattenBindings({ supplier, buyer, company, issuer, doc, today });
  return { supplier, buyer, company, issuer, doc, today, values };
}

function visitInline(item, block, visit) {
  if (!item) return;
  visit(item, block);
  if (Array.isArray(item.content)) item.content.forEach((nested) => visitInline(nested, block, visit));
}

function walkInlines(blocks, visit) {
  if (!Array.isArray(blocks)) return;
  for (const block of blocks) {
    if (Array.isArray(block.content)) {
      block.content.forEach((item) => visitInline(item, block, visit));
    } else if (Array.isArray(block.content?.rows)) {
      block.content.rows.forEach((row) => {
        (row.cells || []).forEach((cell) => {
          const inlines = Array.isArray(cell) ? cell : cell?.content;
          if (Array.isArray(inlines)) inlines.forEach((item) => visitInline(item, block, visit));
        });
      });
    }
    if (Array.isArray(block.children)) walkInlines(block.children, visit);
  }
}

function collectVariablesUsed(content) {
  const used = new Set();
  walkInlines(content, (item) => {
    if (item?.type === "variable" && item.props?.path) used.add(item.props.path);
    if (item?.type === "text" && item.text) {
      const matches = String(item.text).matchAll(TOKEN);
      for (const match of matches) used.add(match[1]);
    }
  });
  return [...used];
}

function cloneContent(content) {
  return JSON.parse(JSON.stringify(content || []));
}

function applyBindings(content, values = {}, { replaceTokens = false } = {}) {
  const next = cloneContent(content);
  const missing = new Set();
  walkInlines(next, (item) => {
    if (item?.type === "variable") {
      const path = item.props?.path || "";
      const meta = VARIABLE_MAP[path] || {};
      const raw = values[path];
      const value = raw == null ? "" : String(raw);
      item.props = {
        path,
        label: item.props?.label || meta.label || path,
        value,
        missing: !value,
      };
      if (!value) missing.add(path);
      return;
    }
    if (replaceTokens && item?.type === "text" && item.text && /\{\{\s*[a-zA-Z0-9_.]+\s*\}\}/.test(item.text)) {
      item.text = String(item.text).replace(TOKEN, (_, path) => {
        const value = values[path];
        if (value == null || value === "") {
          missing.add(path);
          return `{{${path}}}`;
        }
        return String(value);
      });
    }
  });
  return { content: next, missingVariables: [...missing] };
}

function rebindChips(content, values = {}) {
  return applyBindings(content, values, { replaceTokens: false });
}

function bindingRows(values, subjectType) {
  const catalog = catalogForSubject(subjectType);
  return catalog.map((item) => ({
    path: item.path,
    label: item.label,
    group: item.group,
    value: values[item.path] || "",
    missing: !values[item.path],
  }));
}

module.exports = {
  formatDate,
  companyFromSettings,
  flattenBindings,
  buildContext,
  collectVariablesUsed,
  cloneContent,
  applyBindings,
  rebindChips,
  bindingRows,
  walkInlines,
};
