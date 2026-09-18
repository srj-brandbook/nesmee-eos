const { conflictFamily } = require("../registries/actions");

function sortRules(rules = []) {
  return [...rules].sort((a, b) => {
    const priority = (b.priority ?? 0) - (a.priority ?? 0);
    if (priority !== 0) return priority;
    return String(a.id).localeCompare(String(b.id));
  });
}

function actionKey(action) {
  const family = conflictFamily(action.action);
  const target = action.target || action.action;
  return `${family}:${target}`;
}

function resolveActions(matchingRules = []) {
  const ordered = sortRules(matchingRules);
  const claimed = new Set();
  const applied = [];
  const skipped = [];

  for (const rule of ordered) {
    const actions = Array.isArray(rule.then) ? rule.then : [];
    actions.forEach((action, index) => {
      const key = actionKey(action);
      if (claimed.has(key)) {
        skipped.push({ ruleId: rule.id, action, reason: "lower_priority" });
        return;
      }
      claimed.add(key);
      applied.push({ ruleId: rule.id, priority: rule.priority, index, action });
    });
  }

  return { applied, skipped, order: ordered.map((rule) => rule.id) };
}

module.exports = { sortRules, actionKey, resolveActions };
