"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { documentService } from "@/services/documentService";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { usePagination } from "@/hooks/usePagination";
import { useToast } from "@/contexts/ToastProvider";
import { useAuth } from "@/contexts/AuthProvider";
import { Table } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { Card } from "@/components/ui/Card";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { DOCUMENT_TYPES, TEMPLATE_STATUSES, labelFor, statusVariant } from "@/constants/documents";
import { ApiClientError } from "@/lib/api/apiClient";
import { formatDate } from "@/lib/utils";

export function TemplateList() {
  const toast = useToast();
  const { can } = useAuth();
  const { value, setValue, debounced } = useDebouncedSearch();
  const { page, setPage, limit } = usePagination();
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [data, setData] = useState({ items: [], pagination: { page: 1, totalPages: 1 } });
  const [pendingDelete, setPendingDelete] = useState(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    const response = await documentService.templates.list({ search: debounced, status, type, page, limit, sort: "-updatedAt" });
    setData(response.data);
  }

  useEffect(() => {
    load().catch(() => toast.error("Unable to load templates"));
  }, [debounced, status, type, page, limit]);

  async function createBlank() {
    setCreating(true);
    try {
      const response = await documentService.templates.create({ name: "Untitled template", type: "custom", subjectTypes: ["lead"] });
      window.location.assign(`${ROUTES.documentTemplates}/${response.data.template.id}`);
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Could not create template");
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Document templates</h1>
          <p className="text-sm text-muted">Author Notion-style templates with merge fields, then generate official documents.</p>
        </div>
        <div className="flex gap-2">
          <Link href={ROUTES.documents}>
            <Button variant="outline">Library</Button>
          </Link>
          {can(PERMISSIONS.DOCUMENTS_CREATE) ? (
            <Button onClick={createBlank} loading={creating}>
              <Plus className="h-4 w-4" />
              New template
            </Button>
          ) : null}
        </div>
      </div>
      <Card className="overflow-hidden">
        <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-3 lg:max-w-3xl">
          <Input label="Search" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Search templates" />
          <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All</option>
            {TEMPLATE_STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <Select label="Type" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="">All</option>
            {DOCUMENT_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>
        <Table
          empty="No templates yet"
          columns={[
            {
              key: "name",
              label: "Name",
              render: (row) => (
                <Link className="font-medium text-primary hover:underline" href={`${ROUTES.documentTemplates}/${row.id}`}>
                  {row.name}
                </Link>
              ),
            },
            { key: "type", label: "Type", render: (row) => labelFor(DOCUMENT_TYPES, row.type) },
            { key: "status", label: "Status", render: (row) => <Badge variant={statusVariant(row.status)}>{row.status}</Badge> },
            { key: "version", label: "Version", render: (row) => row.published?.version || row.draft?.version || "—" },
            { key: "updatedAt", label: "Updated", render: (row) => formatDate(row.updatedAt) },
            {
              key: "actions",
              label: "",
              render: (row) =>
                can(PERMISSIONS.DOCUMENTS_DELETE) ? (
                  <button type="button" className="text-sm text-danger" onClick={() => setPendingDelete(row)}>
                    Delete
                  </button>
                ) : null,
            },
          ]}
          rows={data.items}
        />
        <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPage={setPage} />
      </Card>
      <ConfirmationDialog
        open={Boolean(pendingDelete)}
        title="Delete template?"
        description="Generated documents stay in the library. This only removes the template."
        confirmLabel="Delete"
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          try {
            await documentService.templates.remove(pendingDelete.id);
            toast.success("Template deleted");
            setPendingDelete(null);
            await load();
          } catch (error) {
            toast.error(error instanceof ApiClientError ? error.message : "Could not delete");
          }
        }}
      />
    </div>
  );
}
