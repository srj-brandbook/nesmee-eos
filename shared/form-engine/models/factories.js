const { createId, toFieldKey, uniqueKey } = require("../ids");
const { FIELD_TYPES } = require("../registries/fieldTypes");
const { createValidator } = require("../registries/validators");
const { createAction } = require("../registries/actions");

function emptyAddress() {
  return { line1: "", line2: "", city: "", state: "", country: "", postalCode: "" };
}

function defaultValueForType(type) {
  const meta = FIELD_TYPES[type];
  if (!meta) return "";
  if (type === "address") return emptyAddress();
  if (Array.isArray(meta.defaultValue)) return [];
  if (meta.defaultValue && typeof meta.defaultValue === "object") return { ...meta.defaultValue };
  return meta.defaultValue;
}

function createSection(overrides = {}) {
  return {
    id: overrides.id || createId("sec"),
    title: overrides.title || "Untitled section",
    description: overrides.description || "",
    order: overrides.order ?? 0,
  };
}

function createField(type, overrides = {}, existingKeys = []) {
  const meta = FIELD_TYPES[type];
  if (!meta) throw new Error(`Unknown field type: ${type}`);
  const label = overrides.label || meta.label;
  const key = uniqueKey(overrides.key || toFieldKey(label, type), existingKeys);
  return {
    id: overrides.id || createId("fld"),
    key,
    type,
    sectionId: overrides.sectionId || "",
    label,
    description: overrides.description || "",
    placeholder: overrides.placeholder || "",
    defaultValue: overrides.defaultValue !== undefined ? overrides.defaultValue : defaultValueForType(type),
    required: Boolean(overrides.required),
    visible: overrides.visible !== false,
    readonly: Boolean(overrides.readonly),
    options: Array.isArray(overrides.options) ? overrides.options : [],
    validators: Array.isArray(overrides.validators) ? overrides.validators : [],
    layout: { columns: 1, width: "full", ...(overrides.layout || {}) },
    metadata: { ...(meta.defaultMetadata || {}), ...(overrides.metadata || {}) },
  };
}

function createOption(label, value) {
  return {
    id: createId("opt"),
    label,
    value: value ?? toFieldKey(label),
  };
}

function createCondition(overrides = {}) {
  return {
    id: overrides.id || createId("cnd"),
    field: overrides.field || "",
    operator: overrides.operator || "equals",
    value: overrides.value ?? "",
  };
}

function createConditionGroup(overrides = {}) {
  return {
    operator: overrides.operator === "OR" ? "OR" : "AND",
    conditions: Array.isArray(overrides.conditions) ? overrides.conditions : [],
    groups: Array.isArray(overrides.groups) ? overrides.groups : [],
  };
}

function createRule(overrides = {}) {
  return {
    id: overrides.id || createId("rule"),
    name: overrides.name || "Untitled rule",
    priority: overrides.priority ?? 50,
    active: overrides.active !== false,
    when: overrides.when || createConditionGroup(),
    then: Array.isArray(overrides.then) ? overrides.then : [],
    targetFieldKey: overrides.targetFieldKey || null,
  };
}

function createDocument(overrides = {}) {
  return {
    id: overrides.id || createId("doc"),
    key: overrides.key || toFieldKey(overrides.label || "document"),
    label: overrides.label || "Document",
    description: overrides.description || "",
    required: Boolean(overrides.required),
    collectIssuedDate: overrides.collectIssuedDate !== false,
    collectExpiryDate: overrides.collectExpiryDate !== false,
    collectIssuer: overrides.collectIssuer !== false,
    collectDocumentNumber: overrides.collectDocumentNumber !== false,
    accept: overrides.accept || [".pdf", ".jpg", ".jpeg", ".png"],
    maxSizeMb: overrides.maxSizeMb || 15,
    maxFiles: overrides.maxFiles || 3,
  };
}

function createStage(overrides = {}) {
  return {
    id: overrides.id || createId("stg"),
    key: overrides.key || toFieldKey(overrides.label || "stage"),
    label: overrides.label || "Stage",
    description: overrides.description || "",
    active: Boolean(overrides.active),
  };
}

function emptyDefinition(overrides = {}) {
  const section = createSection({ title: "General", order: 0 });
  return {
    name: overrides.name || "Untitled form",
    description: overrides.description || "",
    version: overrides.version || "1.0",
    status: overrides.status || "draft",
    sections: overrides.sections || [section],
    fields: overrides.fields || [],
    rules: overrides.rules || [],
    documents: overrides.documents || [],
    stages: overrides.stages || [],
  };
}

function cloneDefinition(definition) {
  return JSON.parse(JSON.stringify(definition || emptyDefinition()));
}

module.exports = {
  emptyAddress,
  defaultValueForType,
  createSection,
  createField,
  createOption,
  createCondition,
  createConditionGroup,
  createRule,
  createDocument,
  createStage,
  emptyDefinition,
  cloneDefinition,
  createValidator,
  createAction,
};
