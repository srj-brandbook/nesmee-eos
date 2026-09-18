const VALIDATOR_TYPES = {
  required: {
    type: "required",
    label: "Required",
    hasValue: false,
    message: "This field is required",
  },
  min_length: {
    type: "min_length",
    label: "Minimum length",
    hasValue: true,
    valueType: "number",
    message: "Value is too short",
  },
  max_length: {
    type: "max_length",
    label: "Maximum length",
    hasValue: true,
    valueType: "number",
    message: "Value is too long",
  },
  min: {
    type: "min",
    label: "Minimum value",
    hasValue: true,
    valueType: "number",
    message: "Value is below the minimum",
  },
  max: {
    type: "max",
    label: "Maximum value",
    hasValue: true,
    valueType: "number",
    message: "Value is above the maximum",
  },
  regex: {
    type: "regex",
    label: "Regex",
    hasValue: true,
    valueType: "string",
    message: "Value does not match the required format",
  },
  email: {
    type: "email",
    label: "Email",
    hasValue: false,
    message: "Enter a valid email address",
  },
  url: {
    type: "url",
    label: "URL",
    hasValue: false,
    message: "Enter a valid URL",
  },
  phone: {
    type: "phone",
    label: "Phone",
    hasValue: false,
    message: "Enter a valid phone number",
  },
  number: {
    type: "number",
    label: "Number",
    hasValue: false,
    message: "Enter a valid number",
  },
  integer: {
    type: "integer",
    label: "Integer",
    hasValue: false,
    message: "Enter a whole number",
  },
  decimal: {
    type: "decimal",
    label: "Decimal",
    hasValue: false,
    message: "Enter a valid decimal number",
  },
  date: {
    type: "date",
    label: "Date",
    hasValue: false,
    message: "Enter a valid date",
  },
  date_range: {
    type: "date_range",
    label: "Date range",
    hasValue: true,
    valueType: "range",
    message: "Date is outside the allowed range",
  },
  file_type: {
    type: "file_type",
    label: "File type",
    hasValue: true,
    valueType: "string",
    message: "File type is not allowed",
  },
  file_size: {
    type: "file_size",
    label: "File size",
    hasValue: true,
    valueType: "number",
    message: "File is too large",
  },
  expression: {
    type: "expression",
    label: "Custom expression",
    hasValue: true,
    valueType: "string",
    message: "Value does not satisfy the expression",
  },
};

function validatorMeta(type) {
  return VALIDATOR_TYPES[type] || null;
}

function createValidator(type, overrides = {}) {
  const meta = VALIDATOR_TYPES[type];
  if (!meta) throw new Error(`Unknown validator: ${type}`);
  return {
    id: overrides.id || `val_${type}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    value: overrides.value ?? (meta.hasValue ? "" : null),
    message: overrides.message || meta.message,
    enabled: overrides.enabled !== false,
  };
}

module.exports = { VALIDATOR_TYPES, validatorMeta, createValidator };
