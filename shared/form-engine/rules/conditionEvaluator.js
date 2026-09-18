const { isBlank, toNumber, toText, toDateString } = require("../normalizeValue");
const { operatorsForField } = require("../registries/fieldTypes");

function asList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (isBlank(value)) return [];
  return [String(value)];
}

function compareText(actual, operator, expected) {
  const left = toText(actual);
  const right = toText(expected);
  const leftLower = left.toLowerCase();
  const rightLower = right.toLowerCase();
  switch (operator) {
    case "equals":
      return leftLower === rightLower;
    case "not_equals":
      return leftLower !== rightLower;
    case "contains":
      return leftLower.includes(rightLower);
    case "does_not_contain":
      return !leftLower.includes(rightLower);
    case "starts_with":
      return leftLower.startsWith(rightLower);
    case "ends_with":
      return leftLower.endsWith(rightLower);
    case "is_empty":
      return isBlank(actual);
    case "is_not_empty":
      return !isBlank(actual);
    default:
      return false;
  }
}

function compareNumber(actual, operator, expected) {
  const left = toNumber(actual);
  if (operator === "is_empty") return left == null;
  if (operator === "is_not_empty") return left != null;
  if (left == null) return false;
  if (operator === "between") {
    const min = toNumber(expected?.from ?? expected?.min ?? expected?.[0]);
    const max = toNumber(expected?.to ?? expected?.max ?? expected?.[1]);
    return left >= min && left <= max;
  }
  const right = toNumber(expected);
  if (right == null) return false;
  if (operator === "equals") return left === right;
  if (operator === "not_equals") return left !== right;
  if (operator === "greater_than") return left > right;
  if (operator === "greater_than_or_equal") return left >= right;
  if (operator === "less_than") return left < right;
  if (operator === "less_than_or_equal") return left <= right;
  return false;
}

function compareDate(actual, operator, expected) {
  const leftText = toDateString(actual);
  if (operator === "is_empty") return isBlank(leftText);
  if (operator === "is_not_empty") return !isBlank(leftText);
  const left = new Date(leftText);
  if (Number.isNaN(left.getTime())) return false;
  if (operator === "between") {
    const from = new Date(expected?.from ?? expected?.[0]);
    const to = new Date(expected?.to ?? expected?.[1]);
    return left >= from && left <= to;
  }
  const right = new Date(toDateString(expected));
  if (Number.isNaN(right.getTime())) return false;
  if (operator === "before") return left < right;
  if (operator === "after") return left > right;
  if (operator === "on" || operator === "equals") return leftText === toDateString(expected);
  if (operator === "not_equals") return leftText !== toDateString(expected);
  return false;
}

function compareArray(actual, operator, expected) {
  const left = asList(actual);
  const right = asList(expected);
  if (operator === "is_empty") return left.length === 0;
  if (operator === "is_not_empty") return left.length > 0;
  if (operator === "contains") return right.every((item) => left.includes(item)) || left.includes(String(expected));
  if (operator === "does_not_contain") return !left.some((item) => right.includes(item));
  if (operator === "contains_any") return right.some((item) => left.includes(item));
  if (operator === "contains_all") return right.every((item) => left.includes(item));
  return false;
}

function compareBoolean(actual, operator, expected) {
  const left = Boolean(actual);
  const right = expected === true || expected === "true" || expected === 1 || expected === "1";
  if (operator === "equals") return left === right;
  if (operator === "not_equals") return left !== right;
  return false;
}

function evaluateCondition(condition, values, fieldsByKey = {}) {
  const field = fieldsByKey[condition.field] || { key: condition.field, type: "text" };
  const actual = values?.[condition.field];
  const operator = condition.operator || "equals";
  const allowed = operatorsForField(field);
  let matched = false;
  if (!allowed.includes(operator) && operator !== "is_empty" && operator !== "is_not_empty") {
    matched = false;
  } else if (field.type === "number" || field.type === "currency" || field.type === "percentage") {
    matched = compareNumber(actual, operator, condition.value);
  } else if (field.type === "date") {
    matched = compareDate(actual, operator, condition.value);
  } else if (field.type === "repeating_group" || (field.type === "dropdown" && field.metadata?.multiple) || (field.type === "checkbox" && field.options?.length)) {
    matched = compareArray(actual, operator, condition.value);
  } else if (field.type === "checkbox") {
    matched = compareBoolean(actual, operator, condition.value);
  } else {
    matched = compareText(actual, operator, condition.value);
  }

  return {
    id: condition.id,
    field: condition.field,
    operator,
    expected: condition.value,
    actual,
    matched,
  };
}

function evaluateGroup(group, values, fieldsByKey = {}) {
  if (!group) return { matched: true, results: [] };
  const operator = group.operator === "OR" ? "OR" : "AND";
  const results = [];
  const conditionResults = (group.conditions || []).map((condition) => evaluateCondition(condition, values, fieldsByKey));
  const groupResults = (group.groups || []).map((child) => evaluateGroup(child, values, fieldsByKey));
  results.push(...conditionResults);
  groupResults.forEach((child) => results.push(...child.results));

  const parts = [...conditionResults.map((item) => item.matched), ...groupResults.map((item) => item.matched)];
  if (!parts.length) {
    return { matched: true, results, operator };
  }
  const matched = operator === "AND" ? parts.every(Boolean) : parts.some(Boolean);
  return { matched, results, operator };
}

function collectFailedConditions(evaluation) {
  return (evaluation.results || []).filter((item) => !item.matched);
}

module.exports = {
  evaluateCondition,
  evaluateGroup,
  collectFailedConditions,
  compareText,
  compareNumber,
  compareDate,
  compareArray,
};
