function isBlank(value) {
  return value == null || value === "" || (Array.isArray(value) && !value.length);
}

function toNumber(value) {
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
}

function toText(value) {
  if (value == null) return "";
  return String(value);
}

function compareText(actual, operator, expected) {
  const left = toText(actual).toLowerCase();
  const right = toText(expected).toLowerCase();
  switch (operator) {
    case "equals":
      return left === right;
    case "not_equals":
      return left !== right;
    case "contains":
      return left.includes(right);
    case "does_not_contain":
      return !left.includes(right);
    case "starts_with":
      return left.startsWith(right);
    case "ends_with":
      return left.endsWith(right);
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

function compareArray(actual, operator, expected) {
  const left = Array.isArray(actual) ? actual.map(String) : isBlank(actual) ? [] : [String(actual)];
  const right = Array.isArray(expected) ? expected.map(String) : isBlank(expected) ? [] : [String(expected)];
  if (operator === "is_empty") return left.length === 0;
  if (operator === "is_not_empty") return left.length > 0;
  if (operator === "contains" || operator === "contains_all") return right.every((item) => left.includes(item));
  if (operator === "does_not_contain") return !left.some((item) => right.includes(item));
  if (operator === "contains_any") return right.some((item) => left.includes(item));
  return false;
}

function evaluateCondition(condition, facts = {}) {
  const field = condition.field;
  const actual = facts[field];
  const operator = condition.operator || "equals";
  const valueType = condition.valueType || (typeof actual === "number" ? "number" : Array.isArray(actual) ? "array" : "text");
  let matched = false;
  if (valueType === "number") matched = compareNumber(actual, operator, condition.value);
  else if (valueType === "array") matched = compareArray(actual, operator, condition.value);
  else matched = compareText(actual, operator, condition.value);
  return { field, operator, expected: condition.value, actual, matched };
}

function evaluateGroup(group, facts = {}) {
  if (!group) return { matched: true, results: [] };
  const operator = group.operator === "OR" ? "OR" : "AND";
  const conditionResults = (group.conditions || []).map((condition) => evaluateCondition(condition, facts));
  const groupResults = (group.groups || []).map((child) => evaluateGroup(child, facts));
  const results = [...conditionResults, ...groupResults.flatMap((child) => child.results)];
  const parts = [...conditionResults.map((item) => item.matched), ...groupResults.map((item) => item.matched)];
  if (!parts.length) return { matched: true, results, operator };
  const matched = operator === "AND" ? parts.every(Boolean) : parts.some(Boolean);
  return { matched, results, operator };
}

function isEffective(rule, at = new Date()) {
  if (rule.enabled === false) return false;
  if (rule.effectiveFrom && new Date(rule.effectiveFrom) > at) return false;
  if (rule.effectiveUntil && new Date(rule.effectiveUntil) < at) return false;
  return true;
}

function evaluateRules(rules = [], facts = {}, at = new Date()) {
  const executed = [];
  rules
    .filter((rule) => isEffective(rule, at))
    .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0))
    .forEach((rule) => {
      const evaluation = evaluateGroup(rule.conditionGroup, facts);
      if (evaluation.matched) {
        executed.push({
          ruleId: String(rule._id || rule.id || ""),
          name: rule.name,
          actions: rule.actions || [],
          evaluation,
        });
      }
    });
  return executed;
}

module.exports = {
  evaluateCondition,
  evaluateGroup,
  evaluateRules,
  isEffective,
  compareText,
  compareNumber,
  compareArray,
};
