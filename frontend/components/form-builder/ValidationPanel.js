"use client";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useFormBuilder } from "@/hooks/useFormBuilder";
import { VALIDATOR_TYPES, fieldSupportsValidator, createValidator } from "@/lib/form-builder/engine";

export function ValidationPanel() {
  const { selectedField, updateField } = useFormBuilder();
  if (!selectedField) {
    return <p className="p-3 text-xs text-muted">Select a field to configure validation.</p>;
  }
  const validators = selectedField.validators || [];
  const available = Object.values(VALIDATOR_TYPES).filter((item) => fieldSupportsValidator(selectedField.type, item.type));

  function setValidators(next) {
    updateField(selectedField.id, { validators: next });
  }

  function update(index, updates) {
    setValidators(validators.map((item, itemIndex) => (itemIndex === index ? { ...item, ...updates } : item)));
  }

  return (
    <div className="space-y-3 p-3">
      <h3 className="text-sm font-semibold">Validation</h3>
      {validators.map((validator, index) => {
        const meta = VALIDATOR_TYPES[validator.type];
        return (
          <div key={validator.id || index} className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{meta?.label || validator.type}</span>
              <Checkbox label="Enabled" checked={validator.enabled !== false} onChange={(event) => update(index, { enabled: event.target.checked })} />
            </div>
            {meta?.hasValue ? (
              <Input
                label="Value"
                value={typeof validator.value === "object" ? JSON.stringify(validator.value) : validator.value ?? ""}
                onChange={(event) => update(index, { value: coerceValue(meta, event.target.value) })}
              />
            ) : null}
            <Input label="Error message" value={validator.message || ""} onChange={(event) => update(index, { message: event.target.value })} />
            <Button variant="ghost" size="sm" onClick={() => setValidators(validators.filter((_, itemIndex) => itemIndex !== index))}>
              Delete
            </Button>
          </div>
        );
      })}
      <Select
        label="Add validation"
        value=""
        onChange={(event) => {
          if (event.target.value) setValidators([...validators, createValidator(event.target.value)]);
        }}
      >
        <option value="">+ Add validation</option>
        {available.map((item) => (
          <option key={item.type} value={item.type}>
            {item.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

function coerceValue(meta, raw) {
  if (meta.valueType === "number") return raw === "" ? "" : Number(raw);
  if (meta.valueType === "range") {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}
