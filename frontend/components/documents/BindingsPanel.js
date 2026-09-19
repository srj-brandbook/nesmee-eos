"use client";

import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export function BindingsPanel({ rows = [], missing = [], onInsert, onRebind, rebinding }) {
  const groups = rows.reduce((acc, row) => {
    const key = row.group || "Fields";
    acc[key] = acc[key] || [];
    acc[key].push(row);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Merge fields</h3>
          <p className="text-xs text-muted">Type @ in the editor or click a field to insert it.</p>
        </div>
        {onRebind ? (
          <Button size="sm" variant="outline" onClick={onRebind} loading={rebinding}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        ) : null}
      </div>
      {missing.length ? (
        <p className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {missing.length} field{missing.length === 1 ? "" : "s"} empty. You can still edit and issue.
        </p>
      ) : (
        <p className="flex items-center gap-2 text-xs text-success">
          <CheckCircle2 className="h-3.5 w-3.5" />
          All known fields have values.
        </p>
      )}
      {Object.entries(groups).map(([group, items]) => (
        <div key={group} className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{group}</p>
          {items.map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => onInsert?.(item)}
              className="flex w-full items-center justify-between gap-2 rounded-md border border-transparent px-2 py-1.5 text-left text-sm hover:border-border hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{item.label}</span>
                <span className="block truncate text-xs text-muted">{item.value || item.path}</span>
              </span>
              <Badge variant={item.missing || !item.value ? "warning" : "success"}>{item.missing || !item.value ? "Empty" : "Ready"}</Badge>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
