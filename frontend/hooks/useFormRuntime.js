"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { applyFieldChange, evaluateRules, initialDerivedState } from "@/lib/form-builder/engine";

export function useFormRuntime(definition) {
  const [values, setValues] = useState({});
  const [derived, setDerived] = useState(() => initialDerivedState(definition || { fields: [] }));
  const [errors, setErrors] = useState({});
  const [matchCache, setMatchCache] = useState({});
  const signature = useMemo(() => JSON.stringify({ fields: definition?.fields, rules: definition?.rules }), [definition]);

  useEffect(() => {
    if (!definition) return;
    const result = evaluateRules({ definition, values: {} });
    setValues(result.values);
    setDerived(result.derived);
    setErrors(result.errors);
    setMatchCache(result.matchCache || {});
  }, [signature, definition]);

  const setFieldValue = useCallback(
    (key, value) => {
      const result = applyFieldChange(definition, { ...values, [key]: value }, key, matchCache);
      setValues(result.values);
      setDerived(result.derived);
      setErrors(result.errors);
      setMatchCache(result.matchCache || matchCache);
      return result;
    },
    [definition, matchCache, values]
  );

  return { values, derived, errors, setFieldValue, setValues };
}
