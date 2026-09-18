"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createCondition, createConditionGroup, operatorsForField, operatorNeedsValue, operatorIsRange, operatorLabel } from "@/lib/form-builder/engine";

function ValueInput({ field, condition, onChange }) {
  if (!operatorNeedsValue(condition.operator)) return null;
  if (operatorIsRange(condition.operator)) {
    const value = condition.value || {};
    return (
      <div className="grid grid-cols-2 gap-2">
        <Input label="From" value={value.from ?? value.min ?? ""} onChange={(event) => onChange({ ...value, from: event.target.value })} />
        <Input label="To" value={value.to ?? value.max ?? ""} onChange={(event) => onChange({ ...value, to: event.target.value })} />
      </div>
    );
  }
  if (field?.options?.length) {
    return (
      <Select label="Value" value={condition.value || ""} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select…</option>
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    );
  }
  const type = field?.type === "number" || field?.type === "currency" || field?.type === "percentage" ? "number" : field?.type === "date" ? "date" : "text";
  return <Input label="Value" type={type} value={condition.value ?? ""} onChange={(event) => onChange(event.target.value)} />;
}

export function ConditionTreeEditor({ group, fields, onChange }) {
  const current = group || createConditionGroup();

  function setOperator(operator) {
    onChange({ ...current, operator });
  }

  function updateCondition(index, updates) {
    const conditions = current.conditions.map((item, itemIndex) => (itemIndex === index ? { ...item, ...updates } : item));
    onChange({ ...current, conditions });
  }

  function updateGroup(index, next) {
    const groups = current.groups.map((item, itemIndex) => (itemIndex === index ? next : item));
    onChange({ ...current, groups });
  }

  return (
    <div className="min-w-0 max-w-full space-y-3 overflow-x-hidden rounded-lg border border-border p-3">
      <Select label="Match" value={current.operator || "AND"} onChange={(event) => setOperator(event.target.value)}>
        <option value="AND">All conditions are met</option>
        <option value="OR">Any condition is met</option>
      </Select>
      {(current.conditions || []).map((condition, index) => {
        const field = fields.find((item) => item.key === condition.field);
        const operators = field ? operatorsForField(field) : ["equals"];
        return (
          <div key={condition.id || index} className="grid min-w-0 grid-cols-1 gap-2 rounded-md bg-slate-50 p-2 dark:bg-slate-900/50 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
            <Select label="Field" value={condition.field} onChange={(event) => updateCondition(index, { field: event.target.value, operator: "equals", value: "" })}>
              <option value="">Select field</option>
              {fields.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </Select>
            <Select label="Operator" value={condition.operator} onChange={(event) => updateCondition(index, { operator: event.target.value })}>
              {operators.map((operator) => (
                <option key={operator} value={operator}>
                  {operatorLabel(operator)}
                </option>
              ))}
            </Select>
            <ValueInput field={field} condition={condition} onChange={(value) => updateCondition(index, { value })} />
            <Button variant="ghost" className="self-end" onClick={() => onChange({ ...current, conditions: current.conditions.filter((_, itemIndex) => itemIndex !== index) })}>
              Remove
            </Button>
          </div>
        );
      })}
      {(current.groups || []).map((child, index) => (
        <div key={index} className="border-l-2 border-primary/40 pl-3">
          <p className="mb-2 text-xs font-semibold uppercase text-muted">Group</p>
          <ConditionTreeEditor group={child} fields={fields} onChange={(next) => updateGroup(index, next)} />
          <Button variant="ghost" size="sm" onClick={() => onChange({ ...current, groups: current.groups.filter((_, itemIndex) => itemIndex !== index) })}>
            Remove group
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => onChange({ ...current, conditions: [...(current.conditions || []), createCondition()] })}>
          Add condition
        </Button>
        <Button variant="outline" size="sm" onClick={() => onChange({ ...current, groups: [...(current.groups || []), createConditionGroup()] })}>
          Add group
        </Button>
      </div>
    </div>
  );
}
