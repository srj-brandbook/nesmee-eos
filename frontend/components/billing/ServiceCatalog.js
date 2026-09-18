"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { billingService } from "@/services/billingService";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { usePagination } from "@/hooks/usePagination";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Table } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { SERVICE_CATEGORIES, formatInr, labelFor } from "@/constants/billing";

export function ServiceCatalog() {
  const { can } = useAuth();
  const toast = useToast();
  const { value, setValue, debounced } = useDebouncedSearch();
  const { page, setPage, limit } = usePagination();
  const [category, setCategory] = useState("");
  const [active, setActive] = useState("");
  const [data, setData] = useState({ items: [], pagination: { page: 1, totalPages: 1 } });
  const [pendingDelete, setPendingDelete] = useState(null);

  async function load() {
    const response = await billingService.listServices({ search: debounced, category, active, page, limit });
    setData(response.data);
  }

  useEffect(() => {
    load().catch(() => toast.error("Unable to load services"));
  }, [debounced, category, active, page, limit]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Service catalog</h1>
          <p className="text-sm text-muted">Priced certificate and compliance services sold to suppliers.</p>
        </div>
        {can(PERMISSIONS.SERVICES_CREATE) ? (
          <Link href={`${ROUTES.billingServices}/new`}>
            <Button>Add service</Button>
          </Link>
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Input label="Search" value={value} onChange={(event) => { setValue(event.target.value); setPage(1); }} />
        <Select label="Category" value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}>
          <option value="">All</option>
          {SERVICE_CATEGORIES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
        <Select label="Status" value={active} onChange={(event) => { setActive(event.target.value); setPage(1); }}>
          <option value="">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Select>
      </div>
      <Card>
        {data.items.length === 0 ? (
          <EmptyState title="No services" description="Create catalog items for FSSAI, HACCP, GST, and other certificates." />
        ) : (
          <Table
            columns={[
              { key: "code", label: "Code" },
              { key: "name", label: "Service" },
              { key: "category", label: "Category", render: (row) => labelFor(SERVICE_CATEGORIES, row.category) },
              { key: "unitPrice", label: "Price", render: (row) => formatInr(row.unitPrice, row.currency) },
              { key: "slaDays", label: "SLA", render: (row) => `${row.slaDays || 0} days` },
              {
                key: "isActive",
                label: "Status",
                render: (row) => <Badge variant={row.isActive ? "success" : "default"}>{row.isActive ? "Active" : "Inactive"}</Badge>,
              },
              {
                key: "actions",
                label: "",
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    <Link href={`${ROUTES.billingServices}/${row.id}`} className="text-sm text-primary">
                      Edit
                    </Link>
                    {can(PERMISSIONS.SERVICES_DELETE) ? (
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
        )}
        <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPage={setPage} />
      </Card>
      <ConfirmationDialog
        open={Boolean(pendingDelete)}
        title="Delete service"
        description={`Remove ${pendingDelete?.name} from the catalog? Existing jobs keep their line items.`}
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          await billingService.removeService(pendingDelete.id);
          setPendingDelete(null);
          toast.success("Service deleted");
          load();
        }}
      />
    </div>
  );
}
