"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { formService } from "@/services/formService";
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
import { FORM_PURPOSES, labelFor } from "@/constants/forms";
import { ApiClientError } from "@/lib/api/apiClient";
import { formatDate } from "@/lib/utils";

const statusVariant = { draft: "default", published: "success", archived: "warning" };

export function FormList() {
  const toast = useToast();
  const { can } = useAuth();
  const { value, setValue, debounced } = useDebouncedSearch();
  const { page, setPage, limit } = usePagination();
  const [status, setStatus] = useState("");
  const [purpose, setPurpose] = useState("");
  const [data, setData] = useState({ items: [], pagination: { page: 1, totalPages: 1 } });
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    const response = await formService.list({ search: debounced, status, purpose, page, limit, sort: "-updatedAt" });
    setData(response.data);
  }

  useEffect(() => {
    load().catch(() => toast.error("Unable to load forms"));
  }, [debounced, status, purpose, page, limit]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await formService.remove(pendingDelete.id);
      toast.success("Form deleted");
      setPendingDelete(null);
      await load();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Could not delete form");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Forms</h1>
          <p className="text-sm text-muted">Build, version, and publish supplier onboarding forms.</p>
        </div>
        {can(PERMISSIONS.FORMS_CREATE) ? (
          <Link href={`${ROUTES.forms}/new`}>
            <Button>
              <Plus className="h-4 w-4" />
              Create form
            </Button>
          </Link>
        ) : null}
      </div>
      <Card className="min-w-0 overflow-hidden">
        <div className="grid min-w-0 gap-3 border-b border-border p-4 sm:grid-cols-3 lg:max-w-3xl">
          <Input label="Search" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Search forms" />
          <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </Select>
          <Select label="Purpose" value={purpose} onChange={(event) => setPurpose(event.target.value)}>
            <option value="">All</option>
            {FORM_PURPOSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>
        <Table
          empty="No forms yet"
          columns={[
            { key: "name", label: "Name", render: (row) => <Link className="font-medium text-primary hover:underline" href={`${ROUTES.forms}/${row.id}`}>{row.name}</Link> },
            { key: "purpose", label: "Purpose", render: (row) => labelFor(FORM_PURPOSES, row.purpose) },
            { key: "status", label: "Status", render: (row) => <Badge variant={statusVariant[row.status] || "default"}>{row.status}</Badge> },
            { key: "version", label: "Version", render: (row) => row.published?.version || row.draft?.version || "—" },
            { key: "updatedAt", label: "Updated", render: (row) => formatDate(row.updatedAt) },
            {
              key: "actions",
              label: "",
              render: (row) => (
                <div className="flex justify-end gap-2">
                  <Link href={`${ROUTES.forms}/${row.id}`} className="text-sm text-primary hover:underline">
                    Edit
                  </Link>
                  {can(PERMISSIONS.FORMS_DELETE) ? (
                    <button type="button" className="text-sm text-danger" onClick={() => setPendingDelete(row)}>
                      Delete
                    </button>
                  ) : null}
                </div>
              ),
            },
          ]}
          rows={data.items}
        />
        <div className="p-4">
          <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPage={setPage} />
        </div>
      </Card>
      <ConfirmationDialog
        open={Boolean(pendingDelete)}
        title="Delete form"
        description="This form will be archived from the list. Existing submissions stay attached to their published version."
        confirmLabel="Delete"
        loading={deleting}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
