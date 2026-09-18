const { FIELD_TYPES, fieldSupportsValidator, operatorsForField } = require("./registries/fieldTypes");
const { VALIDATOR_TYPES } = require("./registries/validators");
const { ACTION_TYPES } = require("./registries/actions");
const { operatorNeedsValue, operatorIsRange } = require("./registries/operators");
const { walkGroup, findSetValueCycles } = require("./rules/dependencyGraph");

function issue(level, code, message, meta = {}) {
  return { level, code, message, ...meta };
}

function validateConditionGroup(group, fieldMap, path, push) {
  if (!group) {
    push(issue("error", "invalid_condition_tree", `Missing condition group at ${path}`));
    return;
  }
  if (!["AND", "OR"].includes(group.operator || "AND")) {
    push(issue("error", "invalid_condition_tree", `Invalid group operator at ${path}`));
  }
  (group.conditions || []).forEach((condition, index) => {
    const here = `${path}.conditions[${index}]`;
    if (!condition.field) {
      push(issue("error", "invalid_condition_tree", `Condition is missing a field at ${here}`));
      return;
    }
    const field = fieldMap[condition.field];
    if (!field) {
      push(issue("error", "broken_rule_reference", `Condition references unknown field "${condition.field}"`, { field: condition.field }));
      return;
    }
    const allowed = operatorsForField(field);
    if (!allowed.includes(condition.operator)) {
      push(issue("error", "invalid_operator", `Operator "${condition.operator}" is not valid for ${field.label}`, { field: field.key }));
    }
    if (operatorNeedsValue(condition.operator) && (condition.value == null || condition.value === "")) {
      push(issue("warning", "missing_condition_value", `Condition on ${field.label} has no value`));
    }
    if (operatorIsRange(condition.operator) && !(condition.value && (condition.value.from != null || condition.value.min != null))) {
      push(issue("error", "invalid_condition_tree", `Between operator on ${field.label} needs a range`));
    }
  });
  (group.groups || []).forEach((child, index) => validateConditionGroup(child, fieldMap, `${path}.groups[${index}]`, push));
}

function validateFormConfiguration(definition) {
  const errors = [];
  const warnings = [];
  const push = (item) => (item.level === "warning" ? warnings.push(item) : errors.push(item));

  const fields = definition.fields || [];
  const sections = definition.sections || [];
  const rules = definition.rules || [];
  const documents = definition.documents || [];
  const stages = definition.stages || [];

  const ids = new Set();
  const keys = new Set();
  const fieldMap = {};
  const sectionIds = new Set(sections.map((item) => item.id));
  const documentKeys = new Set(documents.map((item) => item.key));
  const stageKeys = new Set(stages.map((item) => item.key));

  if (!definition.name || String(definition.name).trim().length < 2) {
    push(issue("error", "invalid_label", "Form name is required"));
  }

  sections.forEach((section, index) => {
    if (!section.id) push(issue("error", "missing_id", `Section ${index + 1} is missing an id`));
    if (!section.title || !String(section.title).trim()) push(issue("error", "invalid_label", `Section ${index + 1} needs a title`));
  });

  fields.forEach((field, index) => {
    if (!field.id) push(issue("error", "missing_id", `Field ${index + 1} is missing an id`));
    else if (ids.has(field.id)) push(issue("error", "duplicate_id", `Duplicate field id "${field.id}"`));
    else ids.add(field.id);

    if (!field.key) push(issue("error", "missing_key", `Field ${index + 1} is missing a key`));
    else if (keys.has(field.key)) push(issue("error", "duplicate_key", `Duplicate field key "${field.key}"`));
    else keys.add(field.key);

    fieldMap[field.key] = field;

    if (!field.label || !String(field.label).trim()) {
      push(issue("error", "invalid_label", `Field "${field.key || index + 1}" needs a label`));
    }
    if (!FIELD_TYPES[field.type]) {
      push(issue("error", "invalid_field_type", `Unknown field type "${field.type}" on ${field.key}`));
    }
    if (field.sectionId && !sectionIds.has(field.sectionId)) {
      push(issue("error", "broken_section", `Field "${field.key}" references a missing section`));
    }
    if (["dropdown", "radio"].includes(field.type) && (!field.options || field.options.length < 2)) {
      push(issue("error", "missing_options", `${field.label || field.key} needs at least two options`));
    }
    if (field.required && field.visible === false) {
      push(issue("warning", "required_hidden", `${field.label || field.key} is hidden but required`));
    }
    const min = field.metadata?.min;
    const max = field.metadata?.max;
    if (min != null && max != null && min !== "" && max !== "" && Number(min) > Number(max)) {
      push(issue("error", "impossible_config", `${field.label || field.key} has min greater than max`));
    }
    (field.validators || []).forEach((validator) => {
      if (!VALIDATOR_TYPES[validator.type]) {
        push(issue("error", "invalid_validator", `Unknown validator "${validator.type}" on ${field.key}`));
        return;
      }
      if (!fieldSupportsValidator(field.type, validator.type)) {
        push(issue("error", "invalid_validator", `Validator "${validator.type}" is not valid for ${field.label || field.key}`));
      }
      const meta = VALIDATOR_TYPES[validator.type];
      if (meta.hasValue && (validator.value == null || validator.value === "")) {
        push(issue("error", "invalid_validator", `${field.label || field.key} validator "${validator.type}" is missing a value`));
      }
      if (validator.type === "regex" && validator.value) {
        try {
          // eslint-disable-next-line no-new
          new RegExp(validator.value);
        } catch {
          push(issue("error", "invalid_validator", `${field.label || field.key} has an invalid regular expression`));
        }
      }
    });
  });

  documents.forEach((doc) => {
    if (!doc.key) push(issue("error", "missing_key", "A document is missing a key"));
    if (!doc.label) push(issue("error", "invalid_label", `Document "${doc.key}" needs a label`));
  });
  stages.forEach((stage) => {
    if (!stage.key) push(issue("error", "missing_key", "A stage is missing a key"));
    if (!stage.label) push(issue("error", "invalid_label", `Stage "${stage.key}" needs a label`));
  });

  const ruleIds = new Set();
  rules.forEach((rule) => {
    if (!rule.id) push(issue("error", "missing_id", `Rule "${rule.name || "Untitled"}" is missing an id`));
    else if (ruleIds.has(rule.id)) push(issue("error", "duplicate_id", `Duplicate rule id "${rule.id}"`));
    else ruleIds.add(rule.id);

    if (!rule.name || !String(rule.name).trim()) push(issue("error", "invalid_label", "A rule is missing a name"));
    if (rule.priority == null || Number(rule.priority) < 1) {
      push(issue("warning", "priority", `Rule "${rule.name}" should have a priority of 1–100`));
    }
    validateConditionGroup(rule.when, fieldMap, `rule:${rule.name}`, push);
    if (!rule.then || rule.then.length === 0) {
      push(issue("warning", "no_actions", `Rule "${rule.name}" has no actions`));
    }
    (rule.then || []).forEach((action) => {
      const meta = ACTION_TYPES[action.action];
      if (!meta) {
        push(issue("error", "invalid_action", `Rule "${rule.name}" uses unknown action "${action.action}"`));
        return;
      }
      if (meta.targetKind === "field") {
        if (!fieldMap[action.target]) {
          push(issue("error", "invalid_action_target", `Rule "${rule.name}" action targets unknown field "${action.target}"`));
        }
      } else if (meta.targetKind === "document") {
        if (!documentKeys.has(action.target)) {
          push(issue("error", "invalid_action_target", `Rule "${rule.name}" action targets unknown document "${action.target}"`));
        }
      } else if (meta.targetKind === "stage") {
        if (!stageKeys.has(action.target)) {
          push(issue("error", "invalid_action_target", `Rule "${rule.name}" action targets unknown stage "${action.target}"`));
        }
      }
    });

    const referenced = [];
    walkGroup(rule.when, (condition) => referenced.push(condition.field));
    if (rule.targetFieldKey && referenced.length === 0) {
      push(issue("warning", "empty_when", `Rule "${rule.name}" has no field conditions`));
    }
  });

  findSetValueCycles(rules).forEach((cycle) => {
    push(issue("error", "circular_dependency", `Circular set-value dependency: ${cycle.join(" → ")}`));
  });

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    errorCount: errors.length,
    warningCount: warnings.length,
  };
}

module.exports = { validateFormConfiguration };
