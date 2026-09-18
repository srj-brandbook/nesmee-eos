"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { X } from "lucide-react";
import { Tabs } from "@/components/ui/Tabs";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FieldLibrary } from "./FieldLibrary";
import { FormCanvas } from "./FormCanvas";
import { FieldProperties } from "./FieldProperties";
import { ValidationPanel } from "./ValidationPanel";
import { ConditionsPanel } from "./ConditionsPanel";
import { BuilderHeader } from "./BuilderHeader";
import { BuilderDrawer } from "./BuilderDrawer";
import { useFormBuilder } from "@/hooks/useFormBuilder";
import { FormRuntime } from "./runtime/FormRuntime";
import { cn } from "@/lib/utils";

export function FormBuilderWorkspace() {
  const { definition, loadError, rightTab, setRightTab, addField, moveField, selectedFieldId, setSelectedFieldId } =
    useFormBuilder();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryCollapsed, setLibraryCollapsed] = useState(false);
  const [centerTab, setCenterTab] = useState("canvas");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const propertiesOpen = Boolean(selectedFieldId);
  const libraryRailCollapsed = propertiesOpen || libraryCollapsed;

  useEffect(() => {
    setLibraryCollapsed(localStorage.getItem("form-builder-library-collapsed") === "true");
  }, []);

  useEffect(() => {
    if (propertiesOpen) setLibraryOpen(false);
  }, [propertiesOpen]);

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") setSelectedFieldId(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setSelectedFieldId]);

  function closeProperties() {
    setSelectedFieldId(null);
  }

  function openLibrary() {
    setSelectedFieldId(null);
    setLibraryCollapsed(false);
    localStorage.setItem("form-builder-library-collapsed", "false");
    setLibraryOpen(true);
  }

  function toggleLibraryCollapsed() {
    if (propertiesOpen) {
      setSelectedFieldId(null);
      setLibraryCollapsed(false);
      localStorage.setItem("form-builder-library-collapsed", "false");
      return;
    }
    setLibraryCollapsed((value) => {
      const next = !value;
      localStorage.setItem("form-builder-library-collapsed", String(next));
      return next;
    });
  }

  function onDragEnd(event) {
    const { active, over } = event;
    if (!over || !definition) return;
    const fromLibrary = active.data.current?.from === "library";
    const overSection = String(over.id).startsWith("section-")
      ? String(over.id).replace("section-", "")
      : over.data.current?.sectionId;
    if (fromLibrary && overSection) {
      addField(active.data.current.type, overSection);
      setLibraryOpen(false);
      return;
    }
    if (active.data.current?.from === "canvas") {
      const fieldId = active.data.current.fieldId;
      const sectionId = overSection || active.data.current.sectionId;
      let index;
      if (over.data.current?.from === "canvas") {
        const sectionFields = definition.fields.filter((field) => field.sectionId === sectionId);
        index = sectionFields.findIndex((field) => field.id === over.data.current.fieldId);
      }
      moveField(fieldId, { sectionId, index });
    }
  }

  if (loadError) return <Alert variant="danger">{loadError}</Alert>;
  if (!definition) return <Spinner label="Loading form" />;

  const rightTabs = [
    { value: "properties", label: "Properties" },
    { value: "conditions", label: "Conditions" },
    { value: "validation", label: "Validation" },
  ];

  const properties = (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="flex min-w-0 items-center gap-1 border-b border-border">
        <Tabs
          tabs={rightTabs}
          value={rightTab}
          onChange={setRightTab}
          size="sm"
          fill
          className="min-w-0 flex-1 border-b-0 p-0.5"
        />
        <Button variant="ghost" size="icon" className="mr-1 shrink-0" aria-label="Close properties" onClick={closeProperties}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden text-[13px] [&_h3]:text-xs [&_h4]:text-xs [&_input]:h-8 [&_input]:text-xs [&_label>span]:text-xs [&_select]:h-8 [&_select]:text-xs [&_textarea]:text-xs">
        {rightTab === "properties" ? <FieldProperties /> : null}
        {rightTab === "conditions" ? <ConditionsPanel /> : null}
        {rightTab === "validation" ? <ValidationPanel /> : null}
      </div>
    </div>
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
      <div className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden rounded-xl border border-border bg-bg">
        <BuilderHeader onOpenLibrary={openLibrary} propertiesOpen={propertiesOpen} />
        <div
          className={cn(
            "grid min-h-0 min-w-0 flex-1 overflow-hidden transition-[grid-template-columns] duration-200",
            propertiesOpen
              ? "lg:grid-cols-[3.5rem_minmax(0,1fr)_20rem]"
              : libraryRailCollapsed
                ? "lg:grid-cols-[3.5rem_minmax(0,1fr)]"
                : "lg:grid-cols-[13.5rem_minmax(0,1fr)]"
          )}
        >
          <aside className="hidden min-h-0 min-w-0 overflow-hidden border-r border-border bg-slate-50 lg:flex lg:flex-col dark:bg-slate-900/40">
            <FieldLibrary collapsed={libraryRailCollapsed} onToggleCollapsed={toggleLibraryCollapsed} />
          </aside>
          <div className="min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-2.5 sm:p-3">
            <div className="mb-2.5 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Tabs
                tabs={[
                  { value: "canvas", label: "Canvas" },
                  { value: "preview", label: "Preview" },
                ]}
                value={centerTab}
                onChange={setCenterTab}
                size="sm"
                className="mb-0 px-0 pt-0"
              />
              <div className="flex min-w-0 flex-wrap gap-1.5">
                {(definition.sections || []).map((section) => (
                  <a
                    key={section.id}
                    href={`#section-${section.id}`}
                    className="max-w-full truncate rounded-full border border-border px-2 py-0.5 text-[11px] hover:border-primary"
                  >
                    {section.title}
                  </a>
                ))}
              </div>
            </div>
            {centerTab === "canvas" ? <FormCanvas /> : <FormRuntime definition={definition} mode="preview" />}
          </div>
          {propertiesOpen ? (
            <aside className="hidden min-h-0 min-w-0 overflow-hidden border-l border-border bg-surface lg:flex lg:flex-col">
              {properties}
            </aside>
          ) : null}
        </div>
      </div>
      <BuilderDrawer open={libraryOpen && !propertiesOpen} onClose={() => setLibraryOpen(false)} title="Field library">
        <FieldLibrary />
      </BuilderDrawer>
      <BuilderDrawer open={propertiesOpen} onClose={closeProperties} side="right" title="Field properties" hideHeader>
        {properties}
      </BuilderDrawer>
      <DragOverlay />
    </DndContext>
  );
}
