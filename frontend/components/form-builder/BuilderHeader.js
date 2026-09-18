"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Can } from "@/components/ui/Can";
import { Alert } from "@/components/ui/Alert";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { useFormBuilder } from "@/hooks/useFormBuilder";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { FORM_PURPOSES } from "@/constants/forms";
import { useToast } from "@/contexts/ToastProvider";
import { ApiClientError } from "@/lib/api/apiClient";
import { cn } from "@/lib/utils";

export function BuilderHeader({ onOpenLibrary, propertiesOpen = false }) {
  const router = useRouter();
  const toast = useToast();
  const { form, definition, saveStatus, persist, publish, patch, updateMeta, configResult, validateNow } = useFormBuilder();
  const [publishing, setPublishing] = useState(false);

  const statusLabel =
    saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Save failed" : "Draft";

  async function handlePublish() {
    setPublishing(true);
    try {
      const result = await publish();
      if (result && !result.ok) {
        toast.error("Fix configuration errors before publishing");
        return;
      }
      toast.success("Form published");
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Publish failed");
      validateNow();
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="shrink-0 space-y-2 border-b border-border bg-surface px-3 py-2 sm:px-4">
      <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted">
            <Link href={ROUTES.forms} className="hover:text-text">
              Forms
            </Link>
            <span> / {definition?.name || "Form"}</span>
          </p>
          <input
            aria-label="Form name"
            className="w-full min-w-0 max-w-full border-0 bg-transparent font-display text-lg font-semibold outline-none focus:ring-0 sm:text-xl"
            value={definition?.name || ""}
            onChange={(event) => patch({ name: event.target.value })}
          />
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
          <Badge variant={form?.status === "published" ? "success" : "default"}>{form?.status || "draft"}</Badge>
          <label className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted">
            <span className="sr-only">Onboarding purpose</span>
            <select
              className="h-8 max-w-[11rem] min-w-0 rounded-md border border-border bg-surface px-2 text-xs text-text"
              value={form?.purpose || "general"}
              onChange={(event) => {
                updateMeta({ purpose: event.target.value }).then(() => toast.success("Purpose saved")).catch((error) => {
                  toast.error(error instanceof ApiClientError ? error.message : "Could not save purpose");
                });
              }}
            >
              {FORM_PURPOSES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <span className="text-xs text-muted" aria-live="polite">
            {statusLabel}
          </span>
          {form?.versions?.length ? (
            <label className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted">
              <span className="sr-only">Version</span>
              <select
                id="version-select"
                className="h-8 max-w-[9rem] min-w-0 rounded-md border border-border bg-surface px-2 text-xs text-text"
                value={form.draft?.id || form.published?.id || ""}
                onChange={() => {}}
              >
                {(form.versions || []).map((version) => (
                  <option key={version.id} value={version.id}>
                    v{version.version} ({version.status})
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <span className="text-xs text-muted">v{definition?.version || "1.0"}</span>
          )}
          <Button
            variant="outline"
            size="sm"
            className={cn("hidden md:inline-flex", !propertiesOpen && "lg:hidden")}
            onClick={onOpenLibrary}
          >
            Fields
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="hidden md:inline-flex"
            onClick={() => router.push(`${ROUTES.forms}/${form?.id}/preview`)}
          >
            Preview
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="hidden md:inline-flex"
            onClick={() => router.push(`${ROUTES.forms}/${form?.id}/rules/new`)}
          >
            Rules
          </Button>
          <Can permission={PERMISSIONS.FORMS_UPDATE}>
            <Button
              variant="outline"
              size="sm"
              className="hidden md:inline-flex"
              onClick={() => persist().then(() => toast.success("Draft saved")).catch((error) => toast.error(error.message))}
            >
              Save
            </Button>
          </Can>
          <div className="md:hidden">
            <Dropdown
              trigger={
                <Button variant="outline" size="sm" aria-label="More actions">
                  More
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              }
            >
              <DropdownItem onClick={onOpenLibrary}>Fields</DropdownItem>
              <DropdownItem href={`${ROUTES.forms}/${form?.id}/preview`}>Preview</DropdownItem>
              <DropdownItem href={`${ROUTES.forms}/${form?.id}/rules/new`}>Rules</DropdownItem>
              <Can permission={PERMISSIONS.FORMS_UPDATE}>
                <DropdownItem
                  onClick={() => persist().then(() => toast.success("Draft saved")).catch((error) => toast.error(error.message))}
                >
                  Save draft
                </DropdownItem>
              </Can>
            </Dropdown>
          </div>
          <Can permission={PERMISSIONS.FORMS_PUBLISH}>
            <Button size="sm" onClick={handlePublish} loading={publishing}>
              Publish
            </Button>
          </Can>
        </div>
      </div>
      {configResult ? (
        <Alert className="break-words" variant={configResult.ok ? (configResult.warningCount ? "warning" : "success") : "danger"}>
          Form validation: {configResult.errorCount} errors, {configResult.warningCount} warnings
          {!configResult.ok ? (
            <ul className="mt-2 list-disc pl-5">
              {configResult.errors.slice(0, 5).map((item) => (
                <li key={item.code + item.message}>{item.message}</li>
              ))}
            </ul>
          ) : null}
        </Alert>
      ) : null}
    </div>
  );
}
