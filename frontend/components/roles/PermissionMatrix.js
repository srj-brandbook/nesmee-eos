"use client";

import { Checkbox } from "@/components/ui/Checkbox";

export function PermissionMatrix({ permissions, selected, onChange, readOnly }) {
  const grouped = permissions.reduce((acc, permission) => {
    acc[permission.module] = acc[permission.module] || [];
    acc[permission.module].push(permission);
    return acc;
  }, {});

  function toggle(id) {
    if (readOnly) return;
    if (selected.includes(id)) onChange(selected.filter((item) => item !== id));
    else onChange([...selected, id]);
  }

  function toggleModule(moduleName) {
    if (readOnly) return;
    const ids = grouped[moduleName].map((item) => item.id);
    const allOn = ids.every((id) => selected.includes(id));
    onChange(allOn ? selected.filter((id) => !ids.includes(id)) : [...new Set([...selected, ...ids])]);
  }

  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([moduleName, items]) => (
        <div key={moduleName} className="rounded-md border border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold capitalize">{moduleName}</h3>
            {!readOnly ? (
              <button type="button" className="text-sm text-primary" onClick={() => toggleModule(moduleName)}>
                Toggle all
              </button>
            ) : null}
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {items.map((permission) => (
              <Checkbox
                key={permission.id}
                label={`${permission.action} — ${permission.description}`}
                checked={selected.includes(permission.id)}
                disabled={readOnly}
                onChange={() => toggle(permission.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
