"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { ACTION_GROUPS, ACTION_TYPES, actionMeta, createAction } from "@/lib/form-builder/engine";

export function ActionListEditor({ actions, definition, onChange }) {
  function update(index, updates) {
    onChange(actions.map((item, itemIndex) => (itemIndex === index ? { ...item, ...updates, config: { ...item.config, ...(updates.config || {}) } } : item)));
  }

  function targetsFor(actionType) {
    const meta = actionMeta(actionType);
    if (!meta) return [];
    if (meta.targetKind === "field") return (definition.fields || []).map((item) => ({ value: item.key, label: item.label }));
    if (meta.targetKind === "document") return (definition.documents || []).map((item) => ({ value: item.key, label: item.label }));
    if (meta.targetKind === "stage") return (definition.stages || []).map((item) => ({ value: item.key, label: item.label }));
    return [];
  }

  return (
    <div className="min-w-0 max-w-full space-y-3 overflow-x-hidden">
      {(actions || []).map((action, index) => {
        const meta = actionMeta(action.action);
        const targets = targetsFor(action.action);
        return (
          <div key={action.id || index} className="grid min-w-0 grid-cols-1 gap-2 rounded-lg border border-border p-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
            <Select label="Action" value={action.action} onChange={(event) => update(index, { action: event.target.value, target: "" })}>
              {ACTION_GROUPS.map((group) => (
                <optgroup key={group.id} label={group.label}>
                  {Object.values(ACTION_TYPES)
                    .filter((item) => item.group === group.id)
                    .map((item) => (
                      <option key={item.type} value={item.type}>
                        {item.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </Select>
            {targets.length ? (
              <Select label="Target" value={action.target || ""} onChange={(event) => update(index, { target: event.target.value })}>
                <option value="">Select…</option>
                {targets.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            ) : (
              <div />
            )}
            {action.action === "set_value" ? (
              <Input label="Value" value={action.config?.value ?? ""} onChange={(event) => update(index, { config: { value: event.target.value } })} />
            ) : null}
            {action.action === "assign_to" ? (
              <Input label="Assignee" value={action.config?.assignee || ""} onChange={(event) => update(index, { config: { assignee: event.target.value } })} />
            ) : null}
            {action.action === "change_status" ? (
              <Input label="Status" value={action.config?.status || ""} onChange={(event) => update(index, { config: { status: event.target.value } })} />
            ) : null}
            {action.action === "create_task" ? (
              <Input label="Task title" value={action.config?.title || ""} onChange={(event) => update(index, { config: { title: event.target.value } })} />
            ) : null}
            {["send_notification", "send_email", "send_sms"].includes(action.action) ? (
              <Textarea label="Message" value={action.config?.message || ""} onChange={(event) => update(index, { config: { message: event.target.value } })} />
            ) : null}
            {action.action === "send_webhook" ? (
              <Input label="URL" value={action.config?.url || ""} onChange={(event) => update(index, { config: { url: event.target.value } })} />
            ) : null}
            <Button variant="ghost" className="self-end" onClick={() => onChange(actions.filter((_, itemIndex) => itemIndex !== index))}>
              Remove
            </Button>
            {meta?.hasConfig && !["set_value", "assign_to", "change_status", "create_task", "send_notification", "send_email", "send_sms", "send_webhook"].includes(action.action) ? (
              <Input className="md:col-span-3" label="Config" value={JSON.stringify(action.config || {})} onChange={() => {}} disabled />
            ) : null}
          </div>
        );
      })}
      <Button variant="outline" size="sm" onClick={() => onChange([...(actions || []), createAction("show_field")])}>
        Add action
      </Button>
    </div>
  );
}
