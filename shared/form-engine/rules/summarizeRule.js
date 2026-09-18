const { operatorLabel } = require("../registries/operators");
const { describeAction } = require("./actionExecutor");

function formatValue(value) {
  if (value == null || value === "") return "empty";
  if (typeof value === "object") {
    if (value.from != null || value.to != null) return `${value.from ?? "…"} – ${value.to ?? "…"}`;
    if (Array.isArray(value)) return value.join(", ");
    return JSON.stringify(value);
  }
  if (typeof value === "number") return new Intl.NumberFormat("en-IN").format(value);
  return String(value);
}

function summarizeCondition(condition, definition) {
  const field = (definition.fields || []).find((item) => item.key === condition.field);
  const label = field?.label || condition.field || "Field";
  if (condition.operator === "is_empty" || condition.operator === "is_not_empty") {
    return `${label} ${operatorLabel(condition.operator)}`;
  }
  return `${label} ${operatorLabel(condition.operator)} ${formatValue(condition.value)}`;
}

function summarizeGroup(group, definition) {
  if (!group) return [];
  const joiner = group.operator === "OR" ? "OR" : "AND";
  const parts = [];
  (group.conditions || []).forEach((condition) => parts.push({ type: "condition", text: summarizeCondition(condition, definition) }));
  (group.groups || []).forEach((child) => {
    parts.push({ type: "group", joiner: child.operator, items: summarizeGroup(child, definition) });
  });
  return parts.length ? parts.map((part, index) => (index === 0 ? part : { joiner, ...part })) : [];
}

function summarizeRule(rule, definition) {
  const whenLines = [];
  function flatten(items, depth = 0) {
    items.forEach((item, index) => {
      if (item.type === "group") {
        flatten(item.items, depth + 1);
        return;
      }
      whenLines.push({
        text: item.text,
        joiner: index === 0 && depth === 0 ? null : item.joiner || "AND",
      });
    });
  }
  flatten(summarizeGroup(rule.when, definition));
  if (!whenLines.length) whenLines.push({ text: "No conditions", joiner: null });

  const thenLines = (rule.then || []).map((action) => describeAction(action, definition));
  return {
    name: rule.name,
    priority: rule.priority,
    active: rule.active !== false,
    when: whenLines,
    then: thenLines,
  };
}

function formatSummaryText(summary) {
  const when = summary.when
    .map((line, index) => (index === 0 ? line.text : `${line.joiner}\n${line.text}`))
    .join("\n");
  const then = summary.then.map((line) => `✓ ${line}`).join("\n");
  return `WHEN\n\n${when}\n\nTHEN\n\n${then || "No actions"}`;
}

module.exports = { summarizeRule, summarizeGroup, summarizeCondition, formatSummaryText, formatValue };
