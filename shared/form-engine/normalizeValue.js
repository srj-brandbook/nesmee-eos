const { FIELD_TYPES } = require("./registries/fieldTypes");
const { emptyAddress } = require("./models/factories");

function isUploadedFile(file) {
  if (!file || typeof file !== "object") return false;
  if (file.url || file.publicId) return true;
  return Boolean(String(file.name || "").trim());
}

function isBlank(value) {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") {
    if (value instanceof Date) return Number.isNaN(value.getTime());
    if (Array.isArray(value.files)) return value.files.filter(isUploadedFile).length === 0;
    if ("url" in value || "publicId" in value || "mimeType" in value || value.size != null) {
      return !isUploadedFile(value);
    }
    return Object.keys(value).length === 0;
  }
  return false;
}

function toNumber(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value).replace(/[,₹$\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function toText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function toDateString(value) {
  if (!value) return "";
  if (typeof value === "string") {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.slice(0, 10);
    return value.slice(0, 10);
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return "";
}

function normalizeFile(value) {
  if (!value) return null;
  if (Array.isArray(value)) return value.map(normalizeFile).filter(Boolean);
  if (typeof value === "object") {
    return {
      name: value.name || "",
      size: Number(value.size) || 0,
      type: value.type || value.mimeType || "",
      url: value.url || "",
      publicId: value.publicId || "",
      resourceType: value.resourceType || "",
    };
  }
  return null;
}

function isEvidenceShape(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return (
    "files" in value ||
    "title" in value ||
    "issuer" in value ||
    "documentNumber" in value ||
    "issuedAt" in value ||
    "issuedDate" in value ||
    "expiresAt" in value ||
    "expiryDate" in value
  );
}

function normalizeDocument(value) {
  if (!value) return null;
  if (Array.isArray(value) || !isEvidenceShape(value)) return normalizeFile(value);
  const files = value.files != null ? normalizeFile(value.files) : value.url || value.publicId ? [normalizeFile(value)] : [];
  const list = Array.isArray(files) ? files : files ? [files] : [];
  return {
    title: toText(value.title),
    description: toText(value.description),
    issuer: toText(value.issuer),
    documentNumber: toText(value.documentNumber),
    issuedAt: toDateString(value.issuedAt || value.issuedDate),
    expiresAt: toDateString(value.expiresAt || value.expiryDate),
    files: list.filter(Boolean),
  };
}

function normalizeAddress(value) {
  const base = emptyAddress();
  if (!value || typeof value !== "object") return base;
  return {
    line1: toText(value.line1),
    line2: toText(value.line2),
    city: toText(value.city),
    state: toText(value.state),
    country: toText(value.country),
    postalCode: toText(value.postalCode),
  };
}

function normalizeValue(field, value) {
  const type = field?.type;
  const meta = FIELD_TYPES[type];
  if (!meta) return value ?? "";

  if (type === "number" || type === "currency" || type === "percentage") return toNumber(value);
  if (type === "date") return toDateString(value);
  if (type === "checkbox") {
    if (Array.isArray(field.options) && field.options.length) {
      return Array.isArray(value) ? value : value ? [value] : [];
    }
    return Boolean(value);
  }
  if (type === "dropdown" && field.metadata?.multiple) {
    return Array.isArray(value) ? value : value ? [value] : [];
  }
  if (type === "file") return normalizeFile(value);
  if (type === "document") return normalizeDocument(value);
  if (type === "address") return normalizeAddress(value);
  if (type === "repeating_group") return Array.isArray(value) ? value : [];
  if (typeof value === "string") return value;
  if (value == null) return "";
  return value;
}

function valuesEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

module.exports = {
  isBlank,
  toNumber,
  toText,
  toDateString,
  normalizeFile,
  normalizeDocument,
  normalizeAddress,
  normalizeValue,
  valuesEqual,
};
