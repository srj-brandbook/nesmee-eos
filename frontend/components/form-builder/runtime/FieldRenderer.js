"use client";

import { memo } from "react";
import { FieldInput } from "../fields/FieldInput";
import { cn } from "@/lib/utils";

const FULL_WIDTH_TYPES = new Set(["textarea", "address", "repeating_group", "file", "document"]);

export function isFullWidthField(field) {
  return field.layout?.columns === 2 || FULL_WIDTH_TYPES.has(field?.type);
}

function FieldRendererInner({ field, value, onChange, error, derived, allValues, className, documentEvidence }) {
  const state = derived || {};
  if (state.visible === false) return null;
  const required = Boolean(field.required || state.required);
  return (
    <div
      className={cn("min-w-0 space-y-1", isFullWidthField(field) && "sm:col-span-2", error && "rounded-md ring-2 ring-danger/40 ring-offset-2 ring-offset-bg", className)}
      data-field-error={error ? "true" : undefined}
    >
      <FieldInput
        field={{ ...field, required }}
        value={value}
        onChange={onChange}
        error={error}
        disabled={state.disabled || state.readonly || field.readonly}
        allValues={allValues}
        documentEvidence={documentEvidence}
      />
      {field.description ? <p className="text-xs text-muted">{field.description}</p> : null}
      {required ? <span className="sr-only">Required</span> : null}
    </div>
  );
}

export const FieldRenderer = memo(FieldRendererInner);
