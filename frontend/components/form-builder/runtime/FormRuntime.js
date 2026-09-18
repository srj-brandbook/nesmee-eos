"use client";

import { useEffect, useMemo, useState } from "react";
import { applyFieldChange, evaluateRules, initialDerivedState } from "@/lib/form-builder/engine";
import { FieldRenderer } from "./FieldRenderer";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";

function withHiddenFieldTypes(definition, hideFieldTypes = []) {
  if (!definition || !hideFieldTypes.length) return definition;
  return {
    ...definition,
    fields: (definition.fields || []).map((field) =>
      hideFieldTypes.includes(field.type)
        ? { ...field, required: false, validators: [], metadata: { ...(field.metadata || {}), accept: [], maxSizeMb: undefined } }
        : field
    ),
  };
}

function visibleFieldErrors(definition, derived, errors, hideFieldTypes = []) {
  const fields = Object.fromEntries((definition?.fields || []).map((field) => [field.key, field]));
  const next = {};
  for (const [key, message] of Object.entries(errors || {})) {
    const field = fields[key];
    if (field && hideFieldTypes.includes(field.type)) continue;
    if (derived?.fields?.[key]?.visible === false) continue;
    next[key] = message;
  }
  return next;
}

export function FormRuntime({
  definition,
  mode = "preview",
  onSubmit,
  onSaveDraft,
  submitting,
  savingDraft,
  initialValues,
  readOnly = false,
  hideFieldTypes = [],
  documentEvidence = false,
  hideActions = false,
  children,
  onValuesChange,
  showAllErrors = false,
}) {
  const [values, setValues] = useState({});
  const [derived, setDerived] = useState(() => initialDerivedState(definition || { fields: [] }));
  const [errors, setErrors] = useState({});
  const [matchCache, setMatchCache] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const runtimeDefinition = useMemo(() => withHiddenFieldTypes(definition, hideFieldTypes), [definition, hideFieldTypes]);

  const signature = useMemo(
    () => JSON.stringify({ fields: runtimeDefinition?.fields, rules: runtimeDefinition?.rules, seed: initialValues || {} }),
    [runtimeDefinition, initialValues]
  );

  useEffect(() => {
    if (!runtimeDefinition) return;
    const result = evaluateRules({ definition: runtimeDefinition, values: { ...(initialValues || {}) } });
    setValues(result.values);
    setDerived(result.derived);
    setErrors(visibleFieldErrors(definition, result.derived, result.errors, hideFieldTypes));
    setMatchCache(result.matchCache || {});
    setSubmitted(Boolean(showAllErrors));
    onValuesChange?.(result.values);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  useEffect(() => {
    if (showAllErrors) setSubmitted(true);
  }, [showAllErrors]);

  function changeField(key, value) {
    if (readOnly) return;
    const result = applyFieldChange(runtimeDefinition, { ...values, [key]: value }, key, matchCache);
    setValues(result.values);
    setDerived(result.derived);
    setErrors(visibleFieldErrors(definition, result.derived, result.errors, hideFieldTypes));
    setMatchCache(result.matchCache || matchCache);
    onValuesChange?.(result.values);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (readOnly) return;
    setSubmitted(true);
    const result = evaluateRules({ definition: runtimeDefinition, values });
    const nextErrors = visibleFieldErrors(definition, result.derived, result.errors, hideFieldTypes);
    setValues(result.values);
    setDerived(result.derived);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      requestAnimationFrame(() => {
        document.querySelector("[data-field-error='true']")?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }
    await onSubmit?.(result);
  }

  async function handleSaveDraft() {
    if (readOnly) return;
    await onSaveDraft?.({ values, derived });
  }

  const sections = [...(definition?.sections || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const showErrors = submitted || mode === "preview";
  const errorItems = Object.entries(errors).map(([key, message]) => {
    const field = (definition?.fields || []).find((item) => item.key === key);
    return { key, label: field?.label || key, message };
  });

  return (
    <form onSubmit={handleSubmit} className="min-w-0 max-w-full space-y-4 overflow-x-hidden" noValidate>
      {showErrors && submitted && errorItems.length ? (
        <Alert variant="warning">
          <p className="font-medium">Fix the highlighted fields before submitting.</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            {errorItems.map((item) => (
              <li key={item.key}>
                {item.label}: {item.message}
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}
      {sections.map((section) => {
        const fields = (definition.fields || []).filter(
          (field) => field.sectionId === section.id && !hideFieldTypes.includes(field.type)
        );
        const visible = fields.filter((field) => derived.fields?.[field.key]?.visible !== false);
        if (!visible.length) return null;
        return (
          <section key={section.id} className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <div className="mb-4">
              <h2 className="font-display text-lg font-semibold">{section.title}</h2>
              {section.description ? <p className="text-sm text-muted">{section.description}</p> : null}
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-4">
              {fields.map((field) => (
                <FieldRenderer
                  key={field.id}
                  field={field}
                  value={values[field.key]}
                  onChange={(value) => changeField(field.key, value)}
                  error={showErrors ? errors[field.key] : null}
                  derived={{
                    ...derived.fields?.[field.key],
                    disabled: readOnly || derived.fields?.[field.key]?.disabled,
                    readonly: readOnly || derived.fields?.[field.key]?.readonly,
                  }}
                  allValues={values}
                  documentEvidence={documentEvidence}
                />
              ))}
            </div>
          </section>
        );
      })}

      {derived.assignment || derived.status || (derived.documents && Object.values(derived.documents).some((item) => item.requested)) ? (
        <div className="flex flex-wrap gap-2">
          {derived.assignment ? <Badge variant="primary">Assigned: {derived.assignment}</Badge> : null}
          {derived.status ? <Badge>Status: {derived.status}</Badge> : null}
          {Object.entries(derived.documents || {})
            .filter(([, item]) => item.requested)
            .map(([key, item]) => (
              <Badge key={key} variant={item.required ? "warning" : "default"}>
                Document {key}
                {item.required ? " required" : " requested"}
              </Badge>
            ))}
          {Object.entries(derived.stages || {})
            .filter(([, item]) => item.active)
            .map(([key]) => (
              <Badge key={key} variant="success">
                Stage {key} active
              </Badge>
            ))}
        </div>
      ) : null}

      {children}

      {mode === "fill" && !readOnly && !hideActions ? (
        <div className="flex items-center justify-end gap-2">
          {onSaveDraft ? (
            <Button type="button" variant="outline" loading={savingDraft} onClick={handleSaveDraft}>
              Save draft
            </Button>
          ) : null}
          <Button type="submit" loading={submitting}>
            {onSaveDraft ? "Submit for review" : "Submit"}
          </Button>
        </div>
      ) : null}

      {submitted && errorItems.length ? (
        <Alert variant="warning">
          <p className="font-medium">Fix the highlighted fields before submitting.</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            {errorItems.map((item) => (
              <li key={item.key}>
                {item.label}: {item.message}
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}
    </form>
  );
}
