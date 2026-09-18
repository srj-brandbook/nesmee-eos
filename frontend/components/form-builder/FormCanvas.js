"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { RequiredMark } from "./FieldLabel";
import { FieldInput } from "./fields/FieldInput";
import { isFullWidthField } from "./runtime/FieldRenderer";
import { useFormBuilder } from "@/hooks/useFormBuilder";
import { getFieldEntry } from "@/lib/form-builder/fieldRegistry";
import { cn } from "@/lib/utils";

function SortableField({ field, selected, onSelect }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
    data: { from: "canvas", fieldId: field.id, sectionId: field.sectionId },
  });
  const { duplicateField, removeField, moveField, definition, selectField } = useFormBuilder();
  const entry = getFieldEntry(field.type);
  const Icon = entry.Icon;
  const sectionFields = definition.fields.filter((item) => item.sectionId === field.sectionId);
  const index = sectionFields.findIndex((item) => item.id === field.id);

  return (
    <div
      ref={setNodeRef}
      data-field-card=""
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={(event) => {
        event.stopPropagation();
        (onSelect || selectField)(field.id);
      }}
      className={cn(
        "min-w-0 cursor-pointer rounded-lg border bg-surface p-2.5 shadow-sm",
        selected ? "border-primary ring-4 ring-primary/20" : "border-border",
        isDragging && "opacity-60",
        isFullWidthField(field) && "sm:col-span-2"
      )}
    >
      <div className="mb-1.5 flex min-w-0 items-start gap-1.5">
        <button
          type="button"
          className="mt-0.5 shrink-0 cursor-grab rounded p-1 text-muted hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label={`Drag ${field.label}`}
          onClick={(event) => event.stopPropagation()}
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1 overflow-hidden text-left">
          <div className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
            <Icon className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
            <span className="min-w-0 truncate">
              {field.label}
              {field.required ? <RequiredMark /> : null}
            </span>
          </div>
          <p className="truncate font-mono text-[10px] leading-4 text-muted">{field.key}</p>
        </div>
        <div className="shrink-0" onClick={(event) => event.stopPropagation()}>
          <Dropdown
            placement="bottom-end"
            trigger={
              <Button variant="ghost" size="icon" aria-label="Field actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            }
          >
            <DropdownItem disabled={index === 0} onClick={() => moveField(field.id, { sectionId: field.sectionId, index: Math.max(0, index - 1) })}>
              Move up
            </DropdownItem>
            <DropdownItem
              disabled={index === sectionFields.length - 1}
              onClick={() => moveField(field.id, { sectionId: field.sectionId, index: index + 1 })}
            >
              Move down
            </DropdownItem>
            <DropdownItem onClick={() => (onSelect || selectField)(field.id, true)}>Edit</DropdownItem>
            <DropdownItem onClick={() => duplicateField(field.id)}>Duplicate</DropdownItem>
            <DropdownItem onClick={() => removeField(field.id)}>Delete</DropdownItem>
          </Dropdown>
        </div>
      </div>
      <div className="pointer-events-none min-w-0 overflow-hidden opacity-90">
        <FieldInput field={field} value={field.defaultValue} onChange={() => {}} disabled hideLabel allValues={{}} />
      </div>
    </div>
  );
}

function SectionBlock({ section }) {
  const { definition, selectedFieldId, selectField, setSelectedSectionId, updateSection, removeSection } = useFormBuilder();
  const { setNodeRef, isOver } = useDroppable({ id: `section-${section.id}`, data: { sectionId: section.id } });
  const fields = definition.fields.filter((field) => field.sectionId === section.id);

  return (
    <section
      id={`section-${section.id}`}
      className={cn("min-w-0 rounded-xl border border-border bg-slate-50/80 p-2.5 dark:bg-slate-900/40 sm:p-3", isOver && "ring-2 ring-primary")}
    >
      <div className="mb-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0 flex-1">
          <Input
            id={`section-title-${section.id}`}
            label="Section title"
            value={section.title}
            onChange={(event) => updateSection(section.id, { title: event.target.value })}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelectedSectionId(section.id)}>
            Add fields here
          </Button>
          {definition.sections.length > 1 ? (
            <Button variant="ghost" size="sm" onClick={() => removeSection(section.id)}>
              Delete section
            </Button>
          ) : null}
        </div>
      </div>
      <div ref={setNodeRef} className="min-w-0">
        <SortableContext items={fields.map((field) => field.id)} strategy={verticalListSortingStrategy}>
          {fields.length ? (
            <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2">
              {fields.map((field) => (
                <SortableField key={field.id} field={field} selected={selectedFieldId === field.id} onSelect={selectField} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-surface py-8 text-center text-sm text-muted">
              Drag a field here or click a field in the library
            </div>
          )}
        </SortableContext>
      </div>
    </section>
  );
}

export function FormCanvas() {
  const { definition, addSection, setSelectedFieldId } = useFormBuilder();
  if (!definition) return null;
  const sections = [...definition.sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return (
    <div className="min-w-0 max-w-full space-y-3 overflow-x-hidden" onClick={() => setSelectedFieldId(null)}>
      {!definition.fields.length ? (
        <EmptyState title="Start building this form" description="Search the field library and add fields to a section." />
      ) : null}
      {sections.map((section) => (
        <SectionBlock key={section.id} section={section} />
      ))}
      <Button variant="outline" onClick={addSection}>
        Add section
      </Button>
    </div>
  );
}
