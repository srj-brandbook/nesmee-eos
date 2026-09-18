"use client";

import { useMemo, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { libraryGroups } from "@/lib/form-builder/fieldRegistry";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { useFormBuilder } from "@/hooks/useFormBuilder";
import { cn } from "@/lib/utils";

function LibraryItem({ item, onAdd, collapsed }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `lib-${item.type}`,
    data: { from: "library", type: item.type },
  });
  const Icon = item.Icon;
  const button = (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={() => onAdd(item.type)}
      aria-label={item.label}
      title={collapsed ? item.label : undefined}
      className={cn(
        "flex w-full min-w-0 items-center rounded-md border border-border bg-surface text-left text-sm hover:border-primary hover:bg-primary/5 focus:outline-none focus:ring-4 focus:ring-primary/30",
        collapsed ? "justify-center px-0 py-2" : "gap-2 px-2.5 py-2",
        isDragging && "opacity-50"
      )}
    >
      <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
      {!collapsed ? <span className="min-w-0 truncate">{item.label}</span> : null}
    </button>
  );

  if (!collapsed) return button;
  return (
    <Tooltip label={item.label} side="right" className="w-full">
      {button}
    </Tooltip>
  );
}

export function FieldLibrary({ collapsed = false, onToggleCollapsed }) {
  const { addField } = useFormBuilder();
  const [query, setQuery] = useState("");
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return libraryGroups()
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => !q || item.label.toLowerCase().includes(q) || item.type.includes(q)),
      }))
      .filter((group) => group.items.length);
  }, [query]);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div
        className={cn(
          "flex shrink-0 border-b border-border",
          collapsed ? "flex-col items-center gap-1 px-1.5 py-2" : "items-center justify-between gap-2 px-3 py-2"
        )}
      >
        {!collapsed ? <p className="text-xs font-semibold uppercase tracking-wide text-muted">Fields</p> : null}
        {onToggleCollapsed ? (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={onToggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand field library" : "Collapse field library"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        ) : null}
      </div>
      {!collapsed ? (
        <div className="shrink-0 border-b border-border px-3 py-3">
          <Input
            id="field-search"
            label="Search fields"
            placeholder="Search fields"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      ) : null}
      <div className={cn("min-h-0 flex-1 overflow-y-auto", collapsed ? "space-y-3 p-1.5" : "space-y-4 p-3")}>
        {groups.map((group, groupIndex) => (
          <div key={group.id}>
            {collapsed ? (
              groupIndex > 0 ? <div className="mx-1 mb-3 h-px bg-border" /> : null
            ) : (
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{group.label}</h3>
            )}
            <div className={cn("grid", collapsed ? "gap-1.5" : "gap-2")}>
              {group.items.map((item) => (
                <LibraryItem key={item.type} item={item} onAdd={addField} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
