"use client";

import { useEffect, useState } from "react";
import { documentService } from "@/services/documentService";

export function DocumentPrintView({ documentId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    documentService.print(documentId).then((response) => setData(response.data)).catch(() => {});
  }, [documentId]);

  useEffect(() => {
    document.body.classList.add("bg-white");
    return () => document.body.classList.remove("bg-white");
  }, []);

  if (!data) return <p className="p-8 text-sm text-muted">Loading document…</p>;
  const { document: doc, html } = data;

  return (
    <div className="mx-auto max-w-4xl bg-white text-slate-900 print:max-w-none">
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{doc.docNumber || "DRAFT"}</p>
          <p className="font-display text-lg font-semibold">{doc.title}</p>
        </div>
        <button type="button" className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white" onClick={() => window.print()}>
          Print
        </button>
      </div>
      <div className="rounded-lg border border-slate-200 p-8 shadow-sm print:border-0 print:p-0 print:shadow-none" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
