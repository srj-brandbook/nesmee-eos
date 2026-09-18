const { TEXT_OPERATORS, NUMBER_OPERATORS, DATE_OPERATORS, ARRAY_OPERATORS, BOOLEAN_OPERATORS } = require("./operators");

const COMMON_PROPERTIES = [
  "label",
  "key",
  "placeholder",
  "helpText",
  "required",
  "readonly",
  "visible",
  "defaultValue",
];

function defineField(config) {
  return {
    icon: "Type",
    group: "basic",
    valueType: "text",
    supportsColumns: true,
    defaultValue: "",
    defaultMetadata: {},
    properties: COMMON_PROPERTIES,
    validators: ["required"],
    operators: TEXT_OPERATORS,
    ...config,
  };
}

const FIELD_TYPES = {
  text: defineField({
    type: "text",
    label: "Text",
    properties: [...COMMON_PROPERTIES, "minLength", "maxLength", "inputMode"],
    validators: ["required", "min_length", "max_length", "regex"],
    defaultMetadata: { minLength: null, maxLength: null, inputMode: "text" },
  }),
  number: defineField({
    type: "number",
    label: "Number",
    icon: "Hash",
    valueType: "number",
    defaultValue: null,
    properties: [...COMMON_PROPERTIES, "min", "max", "precision", "prefix", "suffix"],
    validators: ["required", "number", "integer", "min", "max"],
    operators: NUMBER_OPERATORS,
    defaultMetadata: { min: null, max: null, precision: 0, prefix: "", suffix: "" },
  }),
  email: defineField({
    type: "email",
    label: "Email",
    icon: "Mail",
    properties: [...COMMON_PROPERTIES, "maxLength"],
    validators: ["required", "email", "max_length"],
    defaultMetadata: { inputMode: "email" },
  }),
  phone: defineField({
    type: "phone",
    label: "Phone",
    icon: "Phone",
    validators: ["required", "phone"],
    defaultMetadata: { inputMode: "tel" },
  }),
  date: defineField({
    type: "date",
    label: "Date",
    icon: "Calendar",
    valueType: "date",
    properties: [...COMMON_PROPERTIES, "minDate", "maxDate"],
    validators: ["required", "date", "date_range"],
    operators: DATE_OPERATORS,
    defaultMetadata: { minDate: null, maxDate: null },
  }),
  dropdown: defineField({
    type: "dropdown",
    label: "Dropdown",
    icon: "ChevronDown",
    properties: [...COMMON_PROPERTIES, "options", "searchable", "multiple"],
    validators: ["required"],
    operators: TEXT_OPERATORS,
    defaultMetadata: { searchable: false, multiple: false },
  }),
  radio: defineField({
    type: "radio",
    label: "Radio",
    icon: "CircleDot",
    properties: [...COMMON_PROPERTIES, "options"],
    validators: ["required"],
  }),
  checkbox: defineField({
    type: "checkbox",
    label: "Checkbox",
    icon: "CheckSquare",
    valueType: "boolean",
    defaultValue: false,
    properties: [...COMMON_PROPERTIES, "options"],
    validators: ["required"],
    operators: BOOLEAN_OPERATORS,
  }),
  textarea: defineField({
    type: "textarea",
    label: "Text Area",
    icon: "AlignLeft",
    properties: [...COMMON_PROPERTIES, "minLength", "maxLength", "rows"],
    validators: ["required", "min_length", "max_length", "regex"],
    defaultMetadata: { minLength: null, maxLength: null, rows: 4 },
  }),
  file: defineField({
    type: "file",
    label: "File Upload",
    icon: "Upload",
    group: "advanced",
    valueType: "file",
    defaultValue: null,
    properties: [...COMMON_PROPERTIES, "accept", "maxSizeMb", "maxFiles"],
    validators: ["required", "file_type", "file_size"],
    operators: TEXT_OPERATORS,
    defaultMetadata: { accept: [".pdf", ".jpg", ".png"], maxSizeMb: 10, maxFiles: 1 },
  }),
  document: defineField({
    type: "document",
    label: "Document",
    icon: "FileText",
    group: "advanced",
    valueType: "file",
    defaultValue: null,
    properties: [...COMMON_PROPERTIES, "accept", "maxSizeMb"],
    validators: ["required", "file_type", "file_size"],
    operators: TEXT_OPERATORS,
    defaultMetadata: { accept: [".pdf", ".jpg", ".png"], maxSizeMb: 15, maxFiles: 1 },
  }),
  address: defineField({
    type: "address",
    label: "Address",
    icon: "MapPin",
    group: "advanced",
    valueType: "object",
    defaultValue: { line1: "", line2: "", city: "", state: "", country: "", postalCode: "" },
    properties: COMMON_PROPERTIES.filter((item) => item !== "placeholder" && item !== "defaultValue"),
    validators: ["required"],
    operators: TEXT_OPERATORS,
    supportsColumns: false,
  }),
  country: defineField({
    type: "country",
    label: "Country",
    icon: "Globe",
    group: "advanced",
    properties: [...COMMON_PROPERTIES, "searchable"],
    validators: ["required"],
    defaultMetadata: { searchable: true },
  }),
  state: defineField({
    type: "state",
    label: "State",
    icon: "Map",
    group: "advanced",
    properties: [...COMMON_PROPERTIES, "countryFieldKey"],
    validators: ["required"],
    defaultMetadata: { countryFieldKey: "country" },
  }),
  currency: defineField({
    type: "currency",
    label: "Currency",
    icon: "IndianRupee",
    group: "advanced",
    valueType: "number",
    defaultValue: null,
    properties: [...COMMON_PROPERTIES, "min", "max", "precision", "prefix", "suffix"],
    validators: ["required", "number", "decimal", "min", "max"],
    operators: NUMBER_OPERATORS,
    defaultMetadata: { min: null, max: null, precision: 2, prefix: "₹", suffix: "" },
  }),
  percentage: defineField({
    type: "percentage",
    label: "Percentage",
    icon: "Percent",
    group: "advanced",
    valueType: "number",
    defaultValue: null,
    properties: [...COMMON_PROPERTIES, "min", "max", "precision"],
    validators: ["required", "number", "decimal", "min", "max"],
    operators: NUMBER_OPERATORS,
    defaultMetadata: { min: 0, max: 100, precision: 2, prefix: "", suffix: "%" },
  }),
  repeating_group: defineField({
    type: "repeating_group",
    label: "Repeating Group",
    icon: "Rows3",
    group: "advanced",
    valueType: "array",
    defaultValue: [],
    supportsColumns: false,
    properties: COMMON_PROPERTIES.filter((item) => !["placeholder", "defaultValue"].includes(item)).concat([
      "minItems",
      "maxItems",
      "itemFields",
    ]),
    validators: ["required", "min", "max"],
    operators: ARRAY_OPERATORS,
    defaultMetadata: { minItems: 0, maxItems: 20, itemFields: [] },
  }),
};

const BASIC_FIELD_TYPES = Object.values(FIELD_TYPES).filter((item) => item.group === "basic");
const ADVANCED_FIELD_TYPES = Object.values(FIELD_TYPES).filter((item) => item.group === "advanced");

function fieldTypeMeta(type) {
  return FIELD_TYPES[type] || null;
}

function operatorsForField(field) {
  const meta = fieldTypeMeta(field?.type);
  if (!meta) return TEXT_OPERATORS;
  if (field?.type === "dropdown" && field?.metadata?.multiple) return ARRAY_OPERATORS;
  if (field?.type === "checkbox" && Array.isArray(field?.options) && field.options.length) return ARRAY_OPERATORS;
  return meta.operators;
}

function fieldSupportsProperty(type, property) {
  const meta = fieldTypeMeta(type);
  return Boolean(meta && meta.properties.includes(property));
}

function fieldSupportsValidator(type, validatorType) {
  const meta = fieldTypeMeta(type);
  return Boolean(meta && meta.validators.includes(validatorType));
}

module.exports = {
  FIELD_TYPES,
  BASIC_FIELD_TYPES,
  ADVANCED_FIELD_TYPES,
  COMMON_PROPERTIES,
  fieldTypeMeta,
  operatorsForField,
  fieldSupportsProperty,
  fieldSupportsValidator,
};
