"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useFormBuilder } from "@/hooks/useFormBuilder";
import { fieldSupportsProperty, createOption, createDocument, createStage } from "@/lib/form-builder/engine";
import { ROUTES } from "@/constants/routes";

function Toggle({ label, checked, onChange }) {
  return <Checkbox label={label} checked={checked} onChange={(event) => onChange(event.target.checked)} />;
}

export function FieldProperties() {
  const { selectedField, updateField, definition } = useFormBuilder();
  if (!selectedField) {
    return <FormMetaProperties />;
  }
  const field = selectedField;
  const supports = (property) => fieldSupportsProperty(field.type, property);

  function set(updates) {
    updateField(field.id, updates);
  }

  return (
    <div className="min-w-0 max-w-full space-y-3 overflow-x-hidden p-3">
      <div>
        <h3 className="text-sm font-semibold">General settings</h3>
        <p className="text-xs text-muted">{field.type}</p>
      </div>
      <Input label="Label" value={field.label} onChange={(event) => set({ label: event.target.value })} />
      <Input label="Field key" value={field.key} onChange={(event) => set({ key: event.target.value })} hint="Stable internal identifier" />
      {supports("placeholder") ? (
        <Input label="Placeholder" value={field.placeholder || ""} onChange={(event) => set({ placeholder: event.target.value })} />
      ) : null}
      <Textarea label="Help text" value={field.description || ""} onChange={(event) => set({ description: event.target.value })} />
      <div className="grid gap-2">
        <Toggle label="Required" checked={field.required} onChange={(required) => set({ required })} />
        <Toggle label="Read only" checked={field.readonly} onChange={(readonly) => set({ readonly })} />
        <Toggle label="Visible" checked={field.visible !== false} onChange={(visible) => set({ visible })} />
      </div>
      {supports("defaultValue") && field.type !== "address" && field.type !== "file" && field.type !== "document" ? (
        <Input label="Default value" value={field.defaultValue ?? ""} onChange={(event) => set({ defaultValue: event.target.value })} />
      ) : null}
      {supports("minLength") ? (
        <Input label="Min length" type="number" value={field.metadata?.minLength ?? ""} onChange={(event) => set({ metadata: { minLength: event.target.value === "" ? null : Number(event.target.value) } })} />
      ) : null}
      {supports("maxLength") ? (
        <Input label="Max length" type="number" value={field.metadata?.maxLength ?? ""} onChange={(event) => set({ metadata: { maxLength: event.target.value === "" ? null : Number(event.target.value) } })} />
      ) : null}
      {supports("inputMode") ? (
        <Select label="Input mode" value={field.metadata?.inputMode || "text"} onChange={(event) => set({ metadata: { inputMode: event.target.value } })}>
          <option value="text">Text</option>
          <option value="email">Email</option>
          <option value="numeric">Numeric</option>
          <option value="tel">Telephone</option>
        </Select>
      ) : null}
      {supports("min") ? (
        <Input label="Min" type="number" value={field.metadata?.min ?? ""} onChange={(event) => set({ metadata: { min: event.target.value === "" ? null : Number(event.target.value) } })} />
      ) : null}
      {supports("max") ? (
        <Input label="Max" type="number" value={field.metadata?.max ?? ""} onChange={(event) => set({ metadata: { max: event.target.value === "" ? null : Number(event.target.value) } })} />
      ) : null}
      {supports("precision") ? (
        <Input label="Decimal precision" type="number" value={field.metadata?.precision ?? 0} onChange={(event) => set({ metadata: { precision: Number(event.target.value) } })} />
      ) : null}
      {supports("prefix") ? (
        <Input label="Prefix" value={field.metadata?.prefix || ""} onChange={(event) => set({ metadata: { prefix: event.target.value } })} />
      ) : null}
      {supports("suffix") ? (
        <Input label="Suffix" value={field.metadata?.suffix || ""} onChange={(event) => set({ metadata: { suffix: event.target.value } })} />
      ) : null}
      {supports("searchable") ? (
        <Toggle label="Searchable" checked={Boolean(field.metadata?.searchable)} onChange={(searchable) => set({ metadata: { searchable } })} />
      ) : null}
      {supports("multiple") ? (
        <Toggle label="Allow multiple" checked={Boolean(field.metadata?.multiple)} onChange={(multiple) => set({ metadata: { multiple } })} />
      ) : null}
      {supports("rows") ? (
        <Input label="Rows" type="number" value={field.metadata?.rows ?? 4} onChange={(event) => set({ metadata: { rows: Number(event.target.value) } })} />
      ) : null}
      {supports("accept") ? (
        <Input
          label="Accepted file types"
          value={Array.isArray(field.metadata?.accept) ? field.metadata.accept.join(", ") : field.metadata?.accept || ""}
          onChange={(event) => set({ metadata: { accept: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) } })}
        />
      ) : null}
      {supports("maxSizeMb") ? (
        <Input label="Max file size (MB)" type="number" value={field.metadata?.maxSizeMb ?? 10} onChange={(event) => set({ metadata: { maxSizeMb: Number(event.target.value) } })} />
      ) : null}
      {supports("maxFiles") ? (
        <Input label="Max files" type="number" value={field.metadata?.maxFiles ?? 1} onChange={(event) => set({ metadata: { maxFiles: Number(event.target.value) } })} />
      ) : null}
      {supports("countryFieldKey") ? (
        <Select label="Country field" value={field.metadata?.countryFieldKey || "country"} onChange={(event) => set({ metadata: { countryFieldKey: event.target.value } })}>
          {(definition.fields || [])
            .filter((item) => item.type === "country")
            .map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
        </Select>
      ) : null}
      {fieldTypeSupportsColumns(field.type) ? (
        <Select label="Width" value={String(field.layout?.columns || 1)} onChange={(event) => set({ layout: { columns: Number(event.target.value) } })}>
          <option value="1">Half width</option>
          <option value="2">Full width</option>
        </Select>
      ) : null}
      {supports("options") ? <OptionsEditor field={field} onChange={(options) => set({ options })} /> : null}
    </div>
  );
}

function fieldTypeSupportsColumns(type) {
  return !["address", "repeating_group", "textarea"].includes(type);
}

function OptionsEditor({ field, onChange }) {
  const options = field.options || [];
  function update(index, updates) {
    onChange(options.map((option, optionIndex) => (optionIndex === index ? { ...option, ...updates } : option)));
  }
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Options</div>
      {options.map((option, index) => (
        <div key={option.id || index} className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <Input label={`Label ${index + 1}`} value={option.label} onChange={(event) => update(index, { label: event.target.value })} />
          <Input label={`Value ${index + 1}`} value={option.value} onChange={(event) => update(index, { value: event.target.value })} />
          <Button variant="ghost" className="self-end" onClick={() => onChange(options.filter((_, optionIndex) => optionIndex !== index))}>
            Remove
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...options, createOption(`Option ${options.length + 1}`)])}>
        Add option
      </Button>
    </div>
  );
}

function FormMetaProperties() {
  const { definition, patch, form } = useFormBuilder();
  if (!definition) return null;
  return (
    <div className="min-w-0 max-w-full space-y-3 overflow-x-hidden p-3">
      <h3 className="text-sm font-semibold">Form properties</h3>
      <Input label="Name" value={definition.name} onChange={(event) => patch({ name: event.target.value })} />
      <Textarea label="Description" value={definition.description} onChange={(event) => patch({ description: event.target.value })} />
      <CatalogEditor title="Documents" items={definition.documents} kind="document" />
      <CatalogEditor title="Stages" items={definition.stages} kind="stage" />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Rules</h4>
          {form?.id ? (
            <Link href={`${ROUTES.forms}/${form.id}/rules/new`} className="text-sm text-primary">
              Add rule
            </Link>
          ) : null}
        </div>
        {(definition.rules || []).map((item) => (
          <Link
            key={item.id}
            href={form?.id ? `${ROUTES.forms}/${form.id}/rules/${item.id}` : "#"}
            className="block rounded-md border border-border px-3 py-2 text-sm hover:border-primary"
          >
            {item.name}
            <span className="ml-2 text-xs text-muted">P{item.priority}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function CatalogEditor({ title, items, kind }) {
  const { patch, definition } = useFormBuilder();
  const keyName = kind === "document" ? "documents" : "stages";
  function add() {
    const next = kind === "document" ? createDocument({ label: "New document" }) : createStage({ label: "New stage" });
    patch({ [keyName]: [...(definition[keyName] || []), next] });
  }
  function update(id, updates) {
    patch({ [keyName]: definition[keyName].map((item) => (item.id === id ? { ...item, ...updates } : item)) });
  }
  function remove(id) {
    patch({ [keyName]: definition[keyName].filter((item) => item.id !== id) });
  }
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{title}</div>
      {(items || []).map((item) => (
        <div key={item.id} className="space-y-2 rounded-md border border-border p-2">
          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <Input label="Label" value={item.label} onChange={(event) => update(item.id, { label: event.target.value })} />
            <Input label="Key" value={item.key} onChange={(event) => update(item.id, { key: event.target.value })} />
            <Button variant="ghost" className="self-end" onClick={() => remove(item.id)}>
              Remove
            </Button>
          </div>
          {kind === "document" ? (
            <>
              <Textarea
                label="Description"
                value={item.description || ""}
                onChange={(event) => update(item.id, { description: event.target.value })}
              />
              <div className="flex flex-wrap gap-3">
                <Checkbox
                  label="Required"
                  checked={Boolean(item.required)}
                  onChange={(event) => update(item.id, { required: event.target.checked })}
                />
                <Checkbox
                  label="Issued date"
                  checked={item.collectIssuedDate !== false}
                  onChange={(event) => update(item.id, { collectIssuedDate: event.target.checked })}
                />
                <Checkbox
                  label="Expiry date"
                  checked={item.collectExpiryDate !== false}
                  onChange={(event) => update(item.id, { collectExpiryDate: event.target.checked })}
                />
                <Checkbox
                  label="Issuer"
                  checked={item.collectIssuer !== false}
                  onChange={(event) => update(item.id, { collectIssuer: event.target.checked })}
                />
                <Checkbox
                  label="Document number"
                  checked={item.collectDocumentNumber !== false}
                  onChange={(event) => update(item.id, { collectDocumentNumber: event.target.checked })}
                />
              </div>
            </>
          ) : (
            <Textarea
              label="Description"
              value={item.description || ""}
              onChange={(event) => update(item.id, { description: event.target.value })}
            />
          )}
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add}>
        Add {kind}
      </Button>
    </div>
  );
}
