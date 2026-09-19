"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { documentService } from "@/services/documentService";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { DocumentEditor } from "./DocumentEditor";
import { BindingsPanel } from "./BindingsPanel";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { DOCUMENT_TYPES, SUBJECT_TYPES, labelFor, statusVariant } from "@/constants/documents";
import { ApiClientError } from "@/lib/api/apiClient";

export function TemplateStudio({ templateId }) {
  const toast = useToast();
  const { can } = useAuth();
  const [template, setTemplate] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("custom");
  const [subjectType, setSubjectType] = useState("lead");
  const [variables, setVariables] = useState([]);
  const [saving, setSaving] = useState("");
  const [busy, setBusy] = useState(false);
  const saveTimer = useRef(null);
  const pending = useRef(null);

  const draft = template?.draft || template?.published;
  const canEdit = can(PERMISSIONS.DOCUMENTS_UPDATE);

  async function load() {
    const response = await documentService.templates.get(templateId);
    const next = response.data.template;
    setTemplate(next);
    setName(next.name);
    setDescription(next.description || "");
    setType(next.type);
    setSubjectType(next.subjectTypes?.[0] || "lead");
    const catalog = await documentService.variables({ subjectType: next.subjectTypes?.[0] || "lead" });
    setVariables(catalog.data.items || []);
  }

  useEffect(() => {
    load().catch(() => toast.error("Unable to load template"));
    return () => clearTimeout(saveTimer.current);
  }, [templateId]);

  function scheduleDraft(body) {
    if (!canEdit) return;
    pending.current = { ...(pending.current || {}), ...body };
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const payload = pending.current;
      pending.current = null;
      setSaving("Saving…");
      try {
        const response = await documentService.templates.saveDraft(templateId, payload);
        setTemplate(response.data.template);
        setSaving("Saved");
      } catch (error) {
        setSaving("Save failed");
        toast.error(error instanceof ApiClientError ? error.message : "Could not save draft");
      }
    }, 800);
  }

  async function saveMeta() {
    if (!canEdit) return;
    try {
      const response = await documentService.templates.update(templateId, {
        name,
        description,
        type,
        subjectTypes: [subjectType],
      });
      setTemplate(response.data.template);
      toast.success("Template details saved");
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Could not save");
    }
  }

  async function publish() {
    setBusy(true);
    try {
      const response = await documentService.templates.publish(templateId);
      setTemplate(response.data.template);
      toast.success("Template published");
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Could not publish");
    } finally {
      setBusy(false);
    }
  }

  if (!template || !draft) return <p className="p-6 text-sm text-muted">Loading template…</p>;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={ROUTES.documentTemplates} className="inline-flex items-center gap-1 text-xs text-muted hover:text-text">
            <ArrowLeft className="h-3.5 w-3.5" />
            Templates
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-semibold">{template.name}</h1>
            <Badge variant={statusVariant(template.status)}>{template.status}</Badge>
            <span className="text-sm text-muted">v{draft.version}</span>
            <span className="text-sm text-muted">{saving}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit ? (
            <Button variant="outline" onClick={saveMeta}>
              Save details
            </Button>
          ) : null}
          {can(PERMISSIONS.DOCUMENTS_PUBLISH) ? (
            <Button onClick={publish} loading={busy} disabled={!template.draft}>
              Publish
            </Button>
          ) : null}
        </div>
      </div>
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-h-0 overflow-y-auto rounded-lg border border-border bg-surface">
          <DocumentEditor
            initialContent={draft.content}
            editable={canEdit}
            variables={variables}
            onChange={(content) => scheduleDraft({ content, name })}
          />
        </div>
        <aside className="space-y-4 overflow-y-auto rounded-lg border border-border bg-surface p-4">
          <Input label="Name" value={name} disabled={!canEdit} onChange={(event) => { setName(event.target.value); scheduleDraft({ name: event.target.value }); }} />
          <Textarea label="Description" value={description} disabled={!canEdit} onChange={(event) => setDescription(event.target.value)} />
          <Select label="Type" value={type} disabled={!canEdit} onChange={(event) => setType(event.target.value)}>
            {DOCUMENT_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <Select label="Used for" value={subjectType} disabled={!canEdit} onChange={(event) => setSubjectType(event.target.value)}>
            {SUBJECT_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted">{labelFor(DOCUMENT_TYPES, type)} template. Merge chips stay as placeholders until a document is generated.</p>
          <BindingsPanel rows={variables.map((item) => ({ ...item, value: `{{${item.path}}}`, missing: false }))} missing={[]} />
        </aside>
      </div>
    </div>
  );
}
