"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { Radio } from "@/components/ui/Radio";
import { Button } from "@/components/ui/Button";
import { FieldLabel } from "../FieldLabel";
import { FileUpload } from "@/components/ui/FileUpload";
import { DocumentEvidenceInput } from "@/components/verification/DocumentEvidenceInput";
import { countryOptions, stateOptions } from "@/lib/form-builder/engine";
import { cn } from "@/lib/utils";

export function FieldInput({ field, value, onChange, error, disabled, allValues = {}, hideLabel = false, documentEvidence = false }) {
  const id = `field-${field.key}`;
  const readOnly = disabled || field.readonly;
  const placeholder = field.placeholder || "";
  const describedBy = error ? `${id}-error` : field.description ? `${id}-help` : undefined;
  const common = { id, name: field.key, disabled: readOnly, "aria-invalid": Boolean(error), "aria-describedby": describedBy };
  const label = hideLabel ? undefined : field.label;
  const requiredMark = Boolean(!hideLabel && field.required);

  if (field.type === "textarea") {
    return (
      <Textarea
        {...common}
        label={label}
        requiredMark={requiredMark}
        error={error}
        placeholder={placeholder}
        rows={field.metadata?.rows || 4}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (field.type === "dropdown" || field.type === "country" || field.type === "state") {
    const options =
      field.type === "country"
        ? countryOptions()
        : field.type === "state"
          ? stateOptions(allValues[field.metadata?.countryFieldKey || "country"])
          : field.options || [];
    const multiple = Boolean(field.metadata?.multiple);
    return (
      <Select
        {...common}
        label={label}
        requiredMark={requiredMark}
        error={error}
        multiple={multiple}
        value={multiple ? value || [] : value || ""}
        onChange={(event) => {
          if (multiple) {
            onChange(Array.from(event.target.selectedOptions).map((option) => option.value));
          } else onChange(event.target.value);
        }}
      >
        {multiple ? null : <option value="">Select…</option>}
        {options.map((option) => (
          <option key={option.value || option.id} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    );
  }

  if (field.type === "radio") {
    return (
      <fieldset className="space-y-2">
        {label ? (
          <legend className="text-sm font-medium text-text">
            <FieldLabel required={requiredMark}>{label}</FieldLabel>
          </legend>
        ) : null}
        {(field.options || []).map((option) => (
          <Radio
            key={option.value}
            name={field.key}
            label={option.label}
            checked={value === option.value}
            disabled={readOnly}
            onChange={() => onChange(option.value)}
          />
        ))}
        {error ? <p className="text-xs text-danger">{error}</p> : null}
      </fieldset>
    );
  }

  if (field.type === "checkbox") {
    if (field.options?.length) {
      const selected = Array.isArray(value) ? value : [];
      return (
        <fieldset className="space-y-2">
          {label ? (
            <legend className="text-sm font-medium text-text">
              <FieldLabel required={requiredMark}>{label}</FieldLabel>
            </legend>
          ) : null}
          {field.options.map((option) => (
            <Checkbox
              key={option.value}
              label={option.label}
              checked={selected.includes(option.value)}
              disabled={readOnly}
              onChange={(event) => {
                const next = event.target.checked ? [...selected, option.value] : selected.filter((item) => item !== option.value);
                onChange(next);
              }}
            />
          ))}
          {error ? <p className="text-xs text-danger">{error}</p> : null}
        </fieldset>
      );
    }
    return (
      <div>
        <Checkbox
          label={hideLabel ? "" : <FieldLabel required={requiredMark}>{field.label}</FieldLabel>}
          checked={Boolean(value)}
          disabled={readOnly}
          onChange={(event) => onChange(event.target.checked)}
        />
        {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
      </div>
    );
  }

  if (field.type === "address") {
    const address = value || {};
    function setPart(key, next) {
      onChange({ ...address, [key]: next });
    }
    return (
      <fieldset className="space-y-3">
        {label ? (
          <legend className="text-sm font-medium text-text">
            <FieldLabel required={requiredMark}>{label}</FieldLabel>
          </legend>
        ) : null}
        <Input label="Line 1" value={address.line1 || ""} disabled={readOnly} onChange={(event) => setPart("line1", event.target.value)} />
        <Input label="Line 2" value={address.line2 || ""} disabled={readOnly} onChange={(event) => setPart("line2", event.target.value)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="City" value={address.city || ""} disabled={readOnly} onChange={(event) => setPart("city", event.target.value)} />
          <Input label="State" value={address.state || ""} disabled={readOnly} onChange={(event) => setPart("state", event.target.value)} />
          <Input label="Country" value={address.country || ""} disabled={readOnly} onChange={(event) => setPart("country", event.target.value)} />
          <Input label="Postal code" value={address.postalCode || ""} disabled={readOnly} onChange={(event) => setPart("postalCode", event.target.value)} />
        </div>
        {error ? <p className="text-xs text-danger">{error}</p> : null}
      </fieldset>
    );
  }

  if (field.type === "file" || field.type === "document") {
    const maxFiles = Number(field.metadata?.maxFiles) || 1;
    const listed = Array.isArray(field.metadata?.accept) ? field.metadata.accept.filter(Boolean) : [];
    const accept = listed.length ? listed.join(",") : field.metadata?.accept || "application/pdf,image/*";
    const maxSizeMb = Number(field.metadata?.maxSizeMb) || (field.type === "document" ? 15 : 10);
    if (documentEvidence && field.type === "document") {
      return (
        <DocumentEvidenceInput
          label={label}
          requiredMark={requiredMark}
          value={value}
          onChange={onChange}
          disabled={readOnly}
          error={error}
          accept={accept}
          maxSizeMb={maxSizeMb}
          maxFiles={Math.max(maxFiles, 3)}
        />
      );
    }
    return (
      <FileUpload
        label={label}
        requiredMark={requiredMark}
        folder="forms"
        resourceType="auto"
        accept={accept}
        maxSizeMb={maxSizeMb}
        maxFiles={maxFiles}
        value={value}
        onChange={onChange}
        disabled={readOnly}
        error={error}
      />
    );
  }

  if (field.type === "repeating_group") {
    const rows = Array.isArray(value) ? value : [];
    const itemFields = field.metadata?.itemFields || [];
    return (
      <div className="space-y-2">
        {label ? (
          <div className="text-sm font-medium text-text">
            <FieldLabel required={requiredMark}>{label}</FieldLabel>
          </div>
        ) : null}
        {rows.map((row, index) => (
          <div key={index} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-2">
            {itemFields.map((child) => (
              <Input
                key={child.key}
                label={child.label}
                value={row[child.key] || ""}
                disabled={readOnly}
                onChange={(event) => {
                  const next = rows.map((item, rowIndex) => (rowIndex === index ? { ...item, [child.key]: event.target.value } : item));
                  onChange(next);
                }}
              />
            ))}
            <div className="sm:col-span-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={readOnly}
                onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}
              >
                Remove row
              </Button>
            </div>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          disabled={readOnly || rows.length >= (field.metadata?.maxItems || 20)}
          onClick={() => onChange([...rows, {}])}
        >
          Add row
        </Button>
        {error ? <p className="text-xs text-danger">{error}</p> : null}
      </div>
    );
  }

  const typeMap = {
    number: "number",
    currency: "number",
    percentage: "number",
    email: "email",
    phone: "tel",
    date: "date",
    text: "text",
  };
  const prefix = field.metadata?.prefix;
  const suffix = field.metadata?.suffix;
  return (
    <div className="space-y-1.5">
      {prefix || suffix ? (
        <label className="block space-y-1.5" htmlFor={id}>
          {label ? <FieldLabel required={requiredMark}>{label}</FieldLabel> : null}
          <span className="flex min-w-0 items-center gap-2">
            {prefix ? <span className="shrink-0 text-sm text-muted">{prefix}</span> : null}
            <input
              {...common}
              type={typeMap[field.type] || "text"}
              inputMode={field.metadata?.inputMode}
              placeholder={placeholder}
              value={value ?? ""}
              min={field.metadata?.min ?? undefined}
              max={field.metadata?.max ?? undefined}
              step={field.metadata?.precision ? 1 / 10 ** field.metadata.precision : undefined}
              onChange={(event) =>
                onChange(field.type === "number" || field.type === "currency" || field.type === "percentage" ? event.target.value : event.target.value)
              }
              className={cn(
                "h-10 min-w-0 flex-1 rounded-md border border-border bg-surface px-3 text-sm outline-none ring-primary/30 focus:ring-4",
                error && "border-danger"
              )}
            />
            {suffix ? <span className="shrink-0 text-sm text-muted">{suffix}</span> : null}
          </span>
          {error ? <span className="text-xs text-danger">{error}</span> : null}
        </label>
      ) : (
        <Input
          {...common}
          label={label}
          requiredMark={requiredMark}
          error={error}
          placeholder={placeholder}
          type={typeMap[field.type] || "text"}
          inputMode={field.metadata?.inputMode}
          value={value ?? ""}
          min={field.metadata?.min ?? undefined}
          max={field.metadata?.max ?? undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}
