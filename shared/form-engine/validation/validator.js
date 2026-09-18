const { isBlank, toNumber, toText, toDateString, normalizeValue } = require("../normalizeValue");
const { validatorMeta } = require("../registries/validators");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^(https?:\/\/)[^\s/$.?#].[^\s]*$/i;
const PHONE_RE = /^\+?[0-9()\-\s]{7,20}$/;

function filesOf(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.files)) return value.files;
  return [value];
}

function extensionOf(name = "") {
  const idx = String(name).lastIndexOf(".");
  return idx >= 0 ? String(name).slice(idx).toLowerCase() : "";
}

function parseExpression(expression, value) {
  const source = String(expression || "").trim();
  if (!source) return true;

  const replacements = source
    .replace(/\bAND\b/gi, "&&")
    .replace(/\bOR\b/gi, "||")
    .replace(/\bNOT\b/gi, "!");

  if (!/^[0-9.\s+\-*/%<>=!&|()'"\w]+$/.test(replacements)) {
    throw new Error("Unsupported expression");
  }
  if (/\b(?:function|constructor|window|global|process|require|this)\b/i.test(replacements)) {
    throw new Error("Unsupported expression");
  }

  const numeric = toNumber(value);
  const fn = Function("value", `"use strict"; return (${replacements});`);
  return Boolean(fn(numeric == null ? value : numeric));
}

function runValidator(validator, field, value) {
  if (!validator || validator.enabled === false) return null;
  const type = validator.type;
  const message = validator.message || validatorMeta(type)?.message || "Invalid value";
  const empty = isBlank(value);

  if (type === "required") {
    if (field?.type === "address") {
      const ok = value && value.line1 && value.city && value.country;
      return ok ? null : message;
    }
    return empty ? message : null;
  }

  if (empty) return null;

  if (type === "min_length") {
    return toText(value).length < Number(validator.value) ? message : null;
  }
  if (type === "max_length") {
    return toText(value).length > Number(validator.value) ? message : null;
  }
  if (type === "min") {
    const amount = toNumber(value);
    if (field?.type === "repeating_group") {
      return (Array.isArray(value) ? value.length : 0) < Number(validator.value) ? message : null;
    }
    return amount == null || amount < Number(validator.value) ? message : null;
  }
  if (type === "max") {
    const amount = toNumber(value);
    if (field?.type === "repeating_group") {
      return (Array.isArray(value) ? value.length : 0) > Number(validator.value) ? message : null;
    }
    return amount == null || amount > Number(validator.value) ? message : null;
  }
  if (type === "regex") {
    try {
      return new RegExp(validator.value).test(toText(value)) ? null : message;
    } catch {
      return "Invalid regular expression";
    }
  }
  if (type === "email") return EMAIL_RE.test(toText(value)) ? null : message;
  if (type === "url") return URL_RE.test(toText(value)) ? null : message;
  if (type === "phone") return PHONE_RE.test(toText(value)) ? null : message;
  if (type === "number") return toNumber(value) == null ? message : null;
  if (type === "integer") {
    const amount = toNumber(value);
    return amount == null || !Number.isInteger(amount) ? message : null;
  }
  if (type === "decimal") return toNumber(value) == null ? message : null;
  if (type === "date") {
    const date = new Date(toDateString(value));
    return Number.isNaN(date.getTime()) ? message : null;
  }
  if (type === "date_range") {
    const date = new Date(toDateString(value));
    if (Number.isNaN(date.getTime())) return message;
    const range = validator.value || {};
    if (range.from && date < new Date(range.from)) return message;
    if (range.to && date > new Date(range.to)) return message;
    return null;
  }
  if (type === "file_type") {
    const allowed = String(validator.value || "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    if (!allowed.length) return null;
    const invalid = filesOf(value).some((file) => {
      const ext = extensionOf(file.name);
      const mime = String(file.type || "").toLowerCase();
      return !allowed.some((item) => item === ext || item === mime || (item.startsWith(".") ? item === ext : mime.includes(item)));
    });
    return invalid ? message : null;
  }
  if (type === "file_size") {
    const maxBytes = Number(validator.value) * (Number(validator.value) > 1000 ? 1 : 1024 * 1024);
    const invalid = filesOf(value).some((file) => Number(file.size) > maxBytes);
    return invalid ? message : null;
  }
  if (type === "expression") {
    try {
      return parseExpression(validator.value, value) ? null : message;
    } catch {
      return "Invalid expression";
    }
  }
  return null;
}

function effectiveRequired(field, derivedField) {
  if (derivedField && derivedField.required != null) return Boolean(derivedField.required);
  return Boolean(field?.required);
}

function validateField(field, rawValue, options = {}) {
  const derived = options.derived || {};
  if (derived.visible === false) return { ok: true, error: null };
  if (["number", "currency", "percentage"].includes(field?.type) && !isBlank(rawValue) && toNumber(rawValue) == null) {
    return { ok: false, error: "Enter a valid number", validator: "number" };
  }
  const value = "normalize" in options && options.normalize === false ? rawValue : normalizeValue(field, rawValue);
  const validators = Array.isArray(field?.validators) ? field.validators.filter((item) => item && item.enabled !== false) : [];
  if (effectiveRequired(field, derived) && !validators.some((item) => item.type === "required")) {
    validators.unshift({ type: "required", enabled: true, message: `${field.label || "This field"} is required` });
  }

  const metadata = field?.metadata || {};
  if (metadata.minLength != null && metadata.minLength !== "" && !validators.some((item) => item.type === "min_length")) {
    validators.push({
      type: "min_length",
      value: metadata.minLength,
      enabled: true,
      message: `Must be at least ${metadata.minLength} characters`,
    });
  }
  if (metadata.maxLength != null && metadata.maxLength !== "" && !validators.some((item) => item.type === "max_length")) {
    validators.push({
      type: "max_length",
      value: metadata.maxLength,
      enabled: true,
      message: `Must be at most ${metadata.maxLength} characters`,
    });
  }
  if (metadata.min != null && metadata.min !== "" && !validators.some((item) => item.type === "min")) {
    validators.push({ type: "min", value: metadata.min, enabled: true, message: `Must be at least ${metadata.min}` });
  }
  if (metadata.max != null && metadata.max !== "" && !validators.some((item) => item.type === "max")) {
    validators.push({ type: "max", value: metadata.max, enabled: true, message: `Must be at most ${metadata.max}` });
  }
  if ((field?.type === "file" || field?.type === "document") && metadata.maxSizeMb && !validators.some((item) => item.type === "file_size")) {
    validators.push({
      type: "file_size",
      value: metadata.maxSizeMb,
      enabled: true,
      message: `File must be ${metadata.maxSizeMb} MB or smaller`,
    });
  }
  if ((field?.type === "file" || field?.type === "document") && metadata.accept?.length && !validators.some((item) => item.type === "file_type")) {
    validators.push({
      type: "file_type",
      value: Array.isArray(metadata.accept) ? metadata.accept.join(",") : metadata.accept,
      enabled: true,
      message: "File type is not allowed",
    });
  }

  for (const validator of validators) {
    const error = runValidator(validator, field, value);
    if (error) return { ok: false, error, validator: validator.type };
  }
  return { ok: true, error: null };
}

function validateForm(fields, values, derived = {}) {
  const errors = {};
  for (const field of fields || []) {
    const result = validateField(field, values?.[field.key], { derived: derived.fields?.[field.key] || derived[field.key] });
    if (!result.ok) errors[field.key] = result.error;
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

module.exports = { runValidator, validateField, validateForm, parseExpression };
