const TEXT_OPERATORS = [
  "equals",
  "not_equals",
  "contains",
  "does_not_contain",
  "starts_with",
  "ends_with",
  "is_empty",
  "is_not_empty",
];

const NUMBER_OPERATORS = [
  "equals",
  "not_equals",
  "greater_than",
  "greater_than_or_equal",
  "less_than",
  "less_than_or_equal",
  "between",
];

const DATE_OPERATORS = ["before", "after", "on", "between", "is_empty", "is_not_empty"];

const ARRAY_OPERATORS = ["contains", "does_not_contain", "contains_any", "contains_all", "is_empty", "is_not_empty"];

const BOOLEAN_OPERATORS = ["equals", "not_equals"];

const OPERATOR_LABELS = {
  equals: "equals",
  not_equals: "not equals",
  contains: "contains",
  does_not_contain: "does not contain",
  starts_with: "starts with",
  ends_with: "ends with",
  is_empty: "is empty",
  is_not_empty: "is not empty",
  greater_than: "greater than",
  greater_than_or_equal: "greater than or equal",
  less_than: "less than",
  less_than_or_equal: "less than or equal",
  between: "between",
  before: "before",
  after: "after",
  on: "on",
  contains_any: "contains any",
  contains_all: "contains all",
};

const VALUELESS_OPERATORS = new Set(["is_empty", "is_not_empty"]);
const RANGE_OPERATORS = new Set(["between"]);

function operatorsForValueType(valueType) {
  if (valueType === "number") return NUMBER_OPERATORS;
  if (valueType === "date") return DATE_OPERATORS;
  if (valueType === "array") return ARRAY_OPERATORS;
  if (valueType === "boolean") return BOOLEAN_OPERATORS;
  return TEXT_OPERATORS;
}

function operatorNeedsValue(operator) {
  return !VALUELESS_OPERATORS.has(operator);
}

function operatorIsRange(operator) {
  return RANGE_OPERATORS.has(operator);
}

function operatorLabel(operator) {
  return OPERATOR_LABELS[operator] || operator;
}

module.exports = {
  TEXT_OPERATORS,
  NUMBER_OPERATORS,
  DATE_OPERATORS,
  ARRAY_OPERATORS,
  BOOLEAN_OPERATORS,
  OPERATOR_LABELS,
  VALUELESS_OPERATORS,
  RANGE_OPERATORS,
  operatorsForValueType,
  operatorNeedsValue,
  operatorIsRange,
  operatorLabel,
};
