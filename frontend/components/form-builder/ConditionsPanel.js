"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { useFormBuilder } from "@/hooks/useFormBuilder";
import { ConditionTreeEditor } from "./ConditionTreeEditor";
import { createAction, createConditionGroup } from "@/lib/form-builder/engine";
import { ROUTES } from "@/constants/routes";

const FIELD_ACTIONS = [
  { type: "show_field", label: "Show field" },
  { type: "hide_field", label: "Hide field" },
  { type: "make_required", label: "Make required" },
  { type: "make_optional", label: "Make optional" },
  { type: "enable_field", label: "Enable field" },
  { type: "disable_field", label: "Disable field" },
];

export function ConditionsPanel() {
  const { selectedField, definition, upsertFieldRule, form } = useFormBuilder();
  if (!selectedField) {
    return <p className="p-3 text-xs text-muted">Select a field to configure conditions.</p>;
  }
  const rule = (definition.rules || []).find((item) => item.targetFieldKey === selectedField.key);
  const when = rule?.when || createConditionGroup();
  const selectedActions = new Set((rule?.then || []).map((item) => item.action));

  function toggleAction(type, checked) {
    const current = rule?.then || [createAction("show_field", { target: selectedField.key })];
    const next = checked
      ? [...current.filter((item) => item.action !== type), createAction(type, { target: selectedField.key })]
      : current.filter((item) => item.action !== type);
    upsertFieldRule(selectedField, when, next.length ? next : [createAction("show_field", { target: selectedField.key })]);
  }

  return (
    <div className="space-y-3 p-3">
      <div>
        <h3 className="text-sm font-semibold">Show this field when…</h3>
        <p className="text-xs text-muted">Nested ALL / ANY groups use the same rule engine as the Rule Builder.</p>
      </div>
      <ConditionTreeEditor
        group={when}
        fields={definition.fields.filter((field) => field.key !== selectedField.key)}
        onChange={(next) => upsertFieldRule(selectedField, next, rule?.then || [createAction("show_field", { target: selectedField.key })])}
      />
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Then</h4>
        {FIELD_ACTIONS.map((action) => (
          <Checkbox
            key={action.type}
            label={action.label}
            checked={selectedActions.has(action.type) || (!rule && action.type === "show_field")}
            onChange={(event) => toggleAction(action.type, event.target.checked)}
          />
        ))}
      </div>
      <Link href={`${ROUTES.forms}/${form.id}/rules/${rule?.id || "new"}`}>
        <Button variant="outline" size="sm">
          Open in Rule Builder
        </Button>
      </Link>
    </div>
  );
}
