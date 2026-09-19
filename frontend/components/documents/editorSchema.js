"use client";

import { createReactInlineContentSpec, createReactBlockSpec } from "@blocknote/react";
import { BlockNoteSchema, defaultBlockSpecs, defaultInlineContentSpecs, defaultStyleSpecs, withPageBreak } from "@blocknote/core";
import { cn } from "@/lib/utils";

export const variableSpec = createReactInlineContentSpec(
  {
    type: "variable",
    propSchema: {
      path: { default: "" },
      label: { default: "Variable" },
      value: { default: "" },
      missing: { default: false, type: "boolean" },
    },
    content: "none",
  },
  {
    render: ({ inlineContent }) => {
      const { label, value, missing, path } = inlineContent.props;
      return (
        <span
          className={cn(
            "mx-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium align-middle",
            missing || !value
              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
              : "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200"
          )}
          title={path}
        >
          {value || label || path}
        </span>
      );
    },
  }
);

export const createSignatureBlock = createReactBlockSpec(
  {
    type: "signature",
    propSchema: {
      name: { default: "" },
      title: { default: "" },
    },
    content: "none",
  },
  {
    render: ({ block }) => (
      <div className="my-6 w-56 select-none" contentEditable={false}>
        <div className="mb-2 h-10 border-b border-slate-400" />
        <p className="text-sm font-medium">{block.props.name || "Authorized signatory"}</p>
        <p className="text-xs text-muted">{block.props.title || "Signature"}</p>
      </div>
    ),
  }
);

export const documentSchema = withPageBreak(
  BlockNoteSchema.create({
    blockSpecs: {
      ...defaultBlockSpecs,
      signature: createSignatureBlock(),
    },
    inlineContentSpecs: {
      ...defaultInlineContentSpecs,
      variable: variableSpec,
    },
    styleSpecs: defaultStyleSpecs,
  })
);
