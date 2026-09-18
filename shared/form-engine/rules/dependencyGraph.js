function walkGroup(group, visit) {
  if (!group) return;
  (group.conditions || []).forEach((condition) => visit(condition));
  (group.groups || []).forEach((child) => walkGroup(child, visit));
}

function fieldsInGroup(group) {
  const keys = new Set();
  walkGroup(group, (condition) => {
    if (condition?.field) keys.add(condition.field);
  });
  return [...keys];
}

function buildDependencyMap(rules = []) {
  const map = {};
  for (const rule of rules) {
    if (!rule || rule.active === false) continue;
    for (const fieldKey of fieldsInGroup(rule.when)) {
      if (!map[fieldKey]) map[fieldKey] = [];
      map[fieldKey].push(rule.id);
    }
  }
  return map;
}

function rulesForChangedFields(rules, changedKeys, dependencyMap) {
  const ids = new Set();
  const map = dependencyMap || buildDependencyMap(rules);
  for (const key of changedKeys || []) {
    (map[key] || []).forEach((id) => ids.add(id));
  }
  return (rules || []).filter((rule) => ids.has(rule.id) && rule.active !== false);
}

function setValueTargets(rules = []) {
  const graph = {};
  for (const rule of rules) {
    const sources = fieldsInGroup(rule.when);
    const targets = (rule.then || [])
      .filter((action) => action.action === "set_value" || action.action === "clear_value")
      .map((action) => action.target)
      .filter(Boolean);
    for (const source of sources) {
      if (!graph[source]) graph[source] = [];
      graph[source].push(...targets);
    }
  }
  return graph;
}

function findSetValueCycles(rules = []) {
  const graph = setValueTargets(rules);
  const cycles = [];

  function visit(node, stack) {
    if (stack.includes(node)) {
      cycles.push([...stack.slice(stack.indexOf(node)), node]);
      return;
    }
    stack.push(node);
    (graph[node] || []).forEach((next) => visit(next, stack));
    stack.pop();
  }

  Object.keys(graph).forEach((node) => visit(node, []));
  const unique = [];
  const seen = new Set();
  for (const cycle of cycles) {
    const key = cycle.join(">");
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(cycle);
    }
  }
  return unique;
}

module.exports = {
  walkGroup,
  fieldsInGroup,
  buildDependencyMap,
  rulesForChangedFields,
  setValueTargets,
  findSetValueCycles,
};
