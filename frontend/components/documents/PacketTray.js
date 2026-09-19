"use client";

import { FileText, Trash2 } from "lucide-react";
import { FileUpload } from "@/components/ui/FileUpload";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { documentService } from "@/services/documentService";

export function PacketTray({ document, onChange, onFile, filing, disabled }) {
  const attachments = document?.attachments || [];
  const issued = Boolean(document?.pdf) || ["issued", "filed"].includes(document?.status);
  const packet = document?.packet;
  const pdfHref = document?.id ? documentService.fileUrl(document.id, "pdf") : "";
  const packetHref = document?.id ? documentService.fileUrl(document.id, "packet") : "";

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Filing packet</h3>
        <p className="text-xs text-muted">Issue the PDF, then attach scans to merge into one file.</p>
      </div>
      {issued ? (
        <a href={pdfHref} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
          <FileText className="h-4 w-4 text-primary" />
          <span className="min-w-0 truncate">{document.pdf?.name || "Issued PDF"}</span>
          <Badge variant="success">Issued</Badge>
        </a>
      ) : (
        <p className="text-xs text-muted">No issued PDF yet.</p>
      )}
      <FileUpload
        label="Attach supporting files"
        value={attachments}
        onChange={(files) => onChange?.(files)}
        folder="documents"
        accept="application/pdf,image/*"
        maxFiles={12}
        maxSizeMb={25}
        disabled={disabled}
        hint="PDFs or images. Merged after the official document."
      />
      {attachments.length ? (
        <ul className="space-y-1">
          {attachments.map((file, index) => (
            <li key={file.publicId || file.url || index} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">{file.name || `Attachment ${index + 1}`}</span>
              <button
                type="button"
                className="text-danger"
                disabled={disabled}
                onClick={() => onChange?.(attachments.filter((_, fileIndex) => fileIndex !== index))}
                aria-label="Remove attachment"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {packet || document?.status === "filed" ? (
        <a href={packetHref} className="block text-sm text-primary hover:underline">
          Download filing packet
        </a>
      ) : null}
      {onFile ? (
        <Button onClick={onFile} loading={filing} disabled={!issued}>
          Merge filing packet
        </Button>
      ) : null}
    </div>
  );
}
