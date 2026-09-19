"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
import { Card } from "@/components/ui/Card";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { DOCUMENT_TYPES, DOCUMENT_STATUSES, labelFor, statusVariant } from "@/constants/documents";
import { formatDate } from "@/lib/utils";

export function DocumentList() {
  const toast = useToast();
  const { can } = useAuth();
  const { value, setValue, debounced } = useDebouncedSearch();
  const { page, setPage, limit } = usePagination();
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [data, setData] = useState({ items: [], pagination: { page: 1, totalPages: 1 } });

  useEffect(() => {
    documentService
      .list({ search: debounced, status, type, page, limit, sort: "-updatedAt" })
      .then((response) => setData(response.data))
      .catch(() => toast.error("Unable to load documents"));
  }, [debounced, status, type, page, limit]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Documents</h1>
          <p className="text-sm text-muted">Generated proposals, NOCs, and filing packets.</p>
        </div>
        {can(PERMISSIONS.DOCUMENTS_VIEW) ? (
          <Link href={ROUTES.documentTemplates}>
            <Button variant="outline">Templates</Button>
          </Link>
        ) : null}
      </div>
      <Card className="overflow-hidden">
        <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-3 lg:max-w-3xl">
          <Input label="Search" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Title, number, supplier" />
          <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All</option>
            {DOCUMENT_STATUSES.map((item) => (
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
          empty="No documents yet. Generate one from a supplier or a published template."
          columns={[
            {
              key: "title",
              label: "Title",
              render: (row) => (
                <Link className="font-medium text-primary hover:underline" href={`${ROUTES.documents}/${row.id}`}>
                  {row.title}
                </Link>
              ),
            },
            { key: "docNumber", label: "Number", render: (row) => row.docNumber || "—" },
            { key: "subjectName", label: "Subject", render: (row) => row.subjectName || "—" },
            { key: "type", label: "Type", render: (row) => labelFor(DOCUMENT_TYPES, row.type) },
            { key: "status", label: "Status", render: (row) => <Badge variant={statusVariant(row.status)}>{row.status.replace("_", " ")}</Badge> },
            { key: "updatedAt", label: "Updated", render: (row) => formatDate(row.updatedAt) },
          ]}
          rows={data.items}
        />
        <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPage={setPage} />
      </Card>
    </div>
  );
}
