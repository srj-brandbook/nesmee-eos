const { normalizeValue, valuesEqual } = require("../normalizeValue");
const { validateForm } = require("../validation/validator");
const { evaluateGroup } = require("./conditionEvaluator");
const { buildDependencyMap, rulesForChangedFields } = require("./dependencyGraph");
const { resolveActions } = require("./conflictResolver");
const { initialDerivedState, applyAction, describeAction } = require("./actionExecutor");

const MAX_CYCLES = 8;

function fieldsByKey(definition) {
  const map = {};
  for (const field of definition.fields || []) map[field.key] = field;
  return map;
}

function normalizeAll(definition, values) {
  const next = { ...(values || {}) };
  for (const field of definition.fields || []) {
    if (next[field.key] === undefined) next[field.key] = field.defaultValue;
    next[field.key] = normalizeValue(field, next[field.key]);
  }
  return next;
}

function matchingFromCache(rules, matchCache) {
  return (rules || []).filter((rule) => rule && rule.active !== false && matchCache[rule.id]);
}

function evaluateRules({ definition, values, changedKeys, previousMatch, maxCycles = MAX_CYCLES }) {
  const map = fieldsByKey(definition);
  const currentValues = normalizeAll(definition, values);
  const dependencyMap = buildDependencyMap(definition.rules || []);
  const matchCache = { ...(previousMatch || {}) };
  const executed = [];
  const seenValueWrites = new Set();
  let aborted = null;
  let derived = initialDerivedState(definition);
  let keys = changedKeys && changedKeys.length ? [...changedKeys] : (definition.fields || []).map((field) => field.key);
  const fullRun = !changedKeys || !changedKeys.length || !previousMatch;

  for (let cycle = 0; cycle < maxCycles; cycle += 1) {
    const snapshot = JSON.stringify(currentValues);
    const toTest =
      fullRun && cycle === 0
        ? (definition.rules || []).filter((rule) => rule && rule.active !== false)
        : rulesForChangedFields(definition.rules, keys, dependencyMap);

    for (const rule of toTest) {
      matchCache[rule.id] = evaluateGroup(rule.when, currentValues, map).matched;
    }

    const matched = matchingFromCache(definition.rules, matchCache);
    const resolution = resolveActions(matched);
    derived = initialDerivedState(definition);
    derived.tasks = [];
    derived.communications = [];
    const valueChanges = [];

    for (const item of resolution.applied) {
      const isValue = item.action.action === "set_value" || item.action.action === "clear_value";
      const dedupeKey = `${item.action.action}:${item.action.target}:${JSON.stringify(item.action.config || {})}`;
      if (isValue && seenValueWrites.has(item.action.target) && seenValueWrites.has(dedupeKey)) {
        continue;
      }
      const before = currentValues[item.action.target];
      applyAction(item.action, derived, currentValues, definition);
      executed.push({
        cycle,
        ruleId: item.ruleId,
        action: item.action,
        label: describeAction(item.action, definition),
      });
      if (isValue) {
        seenValueWrites.add(item.action.target);
        seenValueWrites.add(dedupeKey);
        if (!valuesEqual(before, currentValues[item.action.target])) valueChanges.push(item.action.target);
      }
    }

    if (!valueChanges.length) {
      const validation = validateForm(definition.fields, currentValues, derived);
      return {
        values: currentValues,
        derived,
        executed,
        aborted,
        matchCache,
        errors: validation.errors,
        ok: validation.ok,
      };
    }

    keys = [...new Set(valueChanges)];
    if (JSON.stringify(currentValues) === snapshot) {
      aborted = "unchanged";
      const validation = validateForm(definition.fields, currentValues, derived);
      return { values: currentValues, derived, executed, aborted, matchCache, errors: validation.errors, ok: validation.ok };
    }
    if (cycle === maxCycles - 1) aborted = "max_cycles";
  }

  const validation = validateForm(definition.fields, currentValues, derived);
  return {
    values: currentValues,
    derived,
    executed,
    aborted: aborted || "max_cycles",
    matchCache,
    errors: validation.errors,
    ok: validation.ok,
  };
}

function evaluateRule(rule, definition, sampleValues) {
  const map = fieldsByKey(definition);
  const values = normalizeAll(definition, sampleValues);
  const evaluation = evaluateGroup(rule.when, values, map);
  const derived = initialDerivedState(definition);
  const applied = [];
  if (evaluation.matched) {
    for (const action of rule.then || []) {
      applyAction(action, derived, values, definition);
      applied.push({ action, label: describeAction(action, definition) });
    }
  }
  return {
    matched: evaluation.matched,
    failedConditions: (evaluation.results || []).filter((item) => !item.matched),
    results: evaluation.results,
    actions: applied,
    derived,
    values,
  };
}

function applyFieldChange(definition, values, changedKey, previousMatch) {
  return evaluateRules({
    definition,
    values,
    changedKeys: changedKey ? [changedKey] : undefined,
    previousMatch,
  });
}

module.exports = {
  evaluateRules,
  evaluateRule,
  applyFieldChange,
  normalizeAll,
  matchingFromCache,
  MAX_CYCLES,
};
