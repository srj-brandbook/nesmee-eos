"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink, FileDown, Printer } from "lucide-react";
import { documentService } from "@/services/documentService";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { DocumentEditor } from "./DocumentEditor";
import { BindingsPanel } from "./BindingsPanel";
import { PacketTray } from "./PacketTray";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { DOCUMENT_TYPES, labelFor, statusVariant, isEditableStatus } from "@/constants/documents";
import { ApiClientError } from "@/lib/api/apiClient";
import { formatDateTime } from "@/lib/utils";

export function DocumentWorkspace({ documentId, compact = false }) {
  const toast = useToast();
  const { can } = useAuth();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [variables, setVariables] = useState([]);
  const [tab, setTab] = useState("editor");
  const [saving, setSaving] = useState("");
  const [busy, setBusy] = useState("");
  const [voidOpen, setVoidOpen] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const saveTimer = useRef(null);
  const pendingContent = useRef(null);

  async function load() {
    const response = await documentService.get(documentId);
    const next = response.data.document;
    setDoc(next);
    setTitle(next.title);
    const catalog = await documentService.variables({ subjectType: next.subjectType || "lead" });
    const rows = (catalog.data.items || []).map((item) => ({
      ...item,
      value: next.bindings?.[item.path] || "",
      missing: !next.bindings?.[item.path],
    }));
    setVariables(rows);
  }

  useEffect(() => {
    load().catch(() => toast.error("Unable to load document"));
    return () => clearTimeout(saveTimer.current);
  }, [documentId]);

  const editable = isEditableStatus(doc?.status) && can(PERMISSIONS.DOCUMENTS_UPDATE);

  async function persist(body) {
    setSaving("Saving…");
    try {
      const response = await documentService.update(documentId, body);
      setDoc(response.data.document);
      setSaving("Saved");
    } catch (error) {
      setSaving("Save failed");
      toast.error(error instanceof ApiClientError ? error.message : "Could not save");
    }
  }

  function scheduleSave(body) {
    pendingContent.current = { ...(pendingContent.current || {}), ...body };
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const payload = pendingContent.current;
      pendingContent.current = null;
      persist(payload);
    }, 800);
  }

  async function run(action, fn, success) {
    setBusy(action);
    try {
      const result = await fn();
      if (result?.data?.document) setDoc(result.data.document);
      toast.success(success);
      await load();
      if (action === "rebind") setEditorKey((value) => value + 1);
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Action failed");
    } finally {
      setBusy("");
    }
  }

  const bindingRows = useMemo(() => variables, [variables]);

  if (!doc) return <p className="p-6 text-sm text-muted">Loading document…</p>;

  return (
    <div className={compact ? "flex h-full min-h-0 flex-col" : "flex min-h-0 flex-col gap-4"}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0 space-y-2">
          {editable ? (
            <Input value={title} onChange={(event) => { setTitle(event.target.value); scheduleSave({ title: event.target.value }); }} className="h-11 border-transparent bg-transparent px-0 font-display text-2xl font-semibold shadow-none focus:ring-0" />
          ) : (
            <h1 className="font-display text-2xl font-semibold">{doc.title}</h1>
          )}
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <Badge variant={statusVariant(doc.status)}>{doc.status.replace("_", " ")}</Badge>
            <span>{labelFor(DOCUMENT_TYPES, doc.type)}</span>
            {doc.docNumber ? <span>{doc.docNumber}</span> : null}
            {doc.subjectName ? <span>{doc.subjectName}</span> : null}
            <span>{saving}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`${ROUTES.documents}/${doc.id}/print`} target={compact ? "_blank" : undefined}>
            <Button variant="outline" size="sm">
              <Printer className="h-3.5 w-3.5" />
              Preview
            </Button>
          </Link>
          {doc.pdf || ["issued", "filed"].includes(doc.status) ? (
            <a href={documentService.fileUrl(doc.id, "pdf")}>
              <Button variant="outline" size="sm">
                <FileDown className="h-3.5 w-3.5" />
                PDF
              </Button>
            </a>
          ) : null}
          {can(PERMISSIONS.DOCUMENTS_ISSUE) && isEditableStatus(doc.status) ? (
            <Button size="sm" loading={busy === "issue"} onClick={() => run("issue", () => documentService.issue(doc.id), "Document issued")}>
              Issue PDF
            </Button>
          ) : null}
          {can(PERMISSIONS.DOCUMENTS_ISSUE) && ["issued", "filed"].includes(doc.status) ? (
            <Button size="sm" variant="outline" onClick={() => setVoidOpen(true)}>
              Void
            </Button>
          ) : null}
          {!compact ? (
            <Link href={ROUTES.documents}>
              <Button variant="ghost" size="sm">Library</Button>
            </Link>
          ) : (
            <Link href={`${ROUTES.documents}/${doc.id}`}>
              <Button variant="ghost" size="sm">
                <ExternalLink className="h-3.5 w-3.5" />
                Open page
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="px-4">
        <Tabs
          tabs={[
            { value: "editor", label: "Editor" },
            { value: "fields", label: "Fields" },
            { value: "packet", label: "Packet" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === "editor" ? (
        <DocumentEditor
          key={`${doc.id}-${editorKey}`}
          initialContent={doc.content}
          editable={editable}
          variables={bindingRows}
          onChange={(content) => {
            if (!editable) return;
            scheduleSave({ content });
          }}
        />
      ) : null}

      {tab === "fields" ? (
        <div className="p-4">
          <BindingsPanel
            rows={bindingRows}
            missing={doc.missingVariables || []}
            rebinding={busy === "rebind"}
            onRebind={editable ? () => run("rebind", () => documentService.rebind(doc.id), "Values refreshed") : undefined}
          />
        </div>
      ) : null}

      {tab === "packet" ? (
        <div className="p-4">
          <PacketTray
            document={doc}
            disabled={!can(PERMISSIONS.DOCUMENTS_UPDATE)}
            filing={busy === "packet"}
            onChange={(attachments) =>
              run("attachments", () => documentService.saveAttachments(doc.id, { attachments }), "Attachments saved")
            }
            onFile={can(PERMISSIONS.DOCUMENTS_FILE) ? () => run("packet", () => documentService.packet(doc.id), "Filing packet ready") : undefined}
          />
        </div>
      ) : null}

      <p className="px-4 pb-4 text-xs text-muted">Updated {formatDateTime(doc.updatedAt)}</p>

      <ConfirmationDialog
        open={voidOpen}
        title="Void this document?"
        description="The issued PDF stays on file but the document can no longer be used as an official original."
        confirmLabel="Void"
        onClose={() => setVoidOpen(false)}
        onConfirm={async () => {
          await run("void", () => documentService.void(doc.id, { reason: "Voided from studio" }), "Document voided");
          setVoidOpen(false);
        }}
      />
    </div>
  );
}
