"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  getPageBreakReactSlashMenuItems,
  useCreateBlockNote,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/ariakit";
import { filterSuggestionItems } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/core/style.css";
import "@blocknote/ariakit/style.css";
import { documentSchema } from "./editorSchema";
import { uploadService } from "@/services/uploadService";
import { cn } from "@/lib/utils";
import "./editor.css";

function isDark() {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

export function DocumentEditorCanvas({
  initialContent,
  editable = true,
  onChange,
  variables = [],
  className,
}) {
  const [theme, setTheme] = useState("light");
  const safeContent = Array.isArray(initialContent) && initialContent.length ? initialContent : undefined;

  const editor = useCreateBlockNote(
    {
      schema: documentSchema,
      initialContent: safeContent,
      uploadFile: async (file) => {
        const record = await uploadService.uploadFile(file, { folder: "documents", resourceType: "auto" });
        return record.url;
      },
    },
    []
  );

  useEffect(() => {
    setTheme(isDark() ? "dark" : "light");
    const observer = new MutationObserver(() => setTheme(isDark() ? "dark" : "light"));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const variableItems = useMemo(
    () =>
      (variables || []).map((item) => ({
        title: item.label,
        subtext: item.path,
        group: item.group || "Variables",
        aliases: [item.path, item.label],
        onItemClick: () => {
          editor.insertInlineContent([
            {
              type: "variable",
              props: {
                path: item.path,
                label: item.label,
                value: item.value || "",
                missing: Boolean(item.missing),
              },
            },
          ]);
        },
      })),
    [editor, variables]
  );

  function slashItems(query) {
    let pageBreaks = [];
    try {
      pageBreaks = getPageBreakReactSlashMenuItems(editor);
    } catch {
      pageBreaks = [];
    }
    const extras = [
      ...pageBreaks,
      {
        title: "Signature",
        subtext: "Sign-off block",
        group: "Document",
        aliases: ["sign", "signature"],
        onItemClick: () => {
          const cursor = editor.getTextCursorPosition();
          editor.insertBlocks([{ type: "signature" }], cursor.block, "after");
        },
      },
      {
        title: "Variable",
        subtext: "Insert a merge field",
        group: "Document",
        aliases: ["variable", "merge", "field", "chip"],
        onItemClick: () => {
          const first = variables[0];
          if (!first) return;
          editor.insertInlineContent([
            { type: "variable", props: { path: first.path, label: first.label, value: first.value || "", missing: Boolean(first.missing) } },
          ]);
        },
      },
    ];
    return filterSuggestionItems([...getDefaultReactSlashMenuItems(editor), ...extras], query);
  }

  return (
    <div className={cn("doc-editor-canvas min-h-[28rem]", className)}>
      <BlockNoteView editor={editor} editable={editable} theme={theme} slashMenu={false} onChange={() => onChange?.(editor.document)}>
        <SuggestionMenuController triggerCharacter="/" getItems={async (query) => slashItems(query)} />
        <SuggestionMenuController
          triggerCharacter="@"
          getItems={async (query) => filterSuggestionItems(variableItems, query)}
        />
      </BlockNoteView>
    </div>
  );
}
