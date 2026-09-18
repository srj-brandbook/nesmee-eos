"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { exportService } from "@/services/exportService";
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
import { Card } from "@/components/ui/Card";
import { PERMISSIONS } from "@/constants/permissions";
import { MARKET_STATUSES, labelFor, statusVariant, scoreVariant } from "@/constants/export";
import { ApiClientError } from "@/lib/api/apiClient";

export function MarketTable() {
  const { can } = useAuth();
  const toast = useToast();
  const { value, setValue, debounced } = useDebouncedSearch();
  const { page, setPage, limit } = usePagination({ page: 1, limit: 50 });
  const [status, setStatus] = useState("");
  const [data, setData] = useState({ items: [], pagination: { page: 1, totalPages: 1 } });
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    const response = await exportService.markets.list({ search: debounced, status, page, limit, sort: "-createdAt" });
    setData(response.data);
  }

  useEffect(() => {
    load().catch(() => toast.error("Unable to load markets"));
  }, [debounced, status, page, limit]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await exportService.markets.remove(pendingDelete.id);
      toast.success("Market deleted");
      setPendingDelete(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not delete market");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Export markets</h1>
          <p className="text-sm text-muted">Destination countries and defined export markets.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/export/markets/compare">
            <Button variant="outline">Compare</Button>
          </Link>
          {can(PERMISSIONS.EXPORT_MARKETS_CREATE) ? (
            <Link href="/export/markets/new">
              <Button>
                <Plus className="h-4 w-4" />
                New market
              </Button>
            </Link>
          ) : null}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Input label="Search" value={value} onChange={(event) => { setValue(event.target.value); setPage(1); }} placeholder="Name or country" />
        <Select label="Status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {MARKET_STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
      </div>
      <Card>
        <Table
          empty="No markets yet."
          columns={[
            {
              key: "name",
              label: "Market",
              render: (row) => (
                <Link href={`/export/markets/${row.id}`} className="font-medium text-primary">
                  {row.name}
                </Link>
              ),
            },
            { key: "country", label: "Country", render: (row) => `${row.countryName || row.countryCode}` },
            { key: "status", label: "Status", render: (row) => <Badge variant={statusVariant(row.status)}>{labelFor(MARKET_STATUSES, row.status)}</Badge> },
            { key: "owner", label: "Owner", render: (row) => row.owner?.name || "—" },
            {
              key: "score",
              label: "Opportunity",
              render: (row) => <Badge variant={scoreVariant(row.opportunityScore)}>{row.opportunityScore}</Badge>,
            },
            { key: "risk", label: "Risk", render: (row) => row.riskScore },
            { key: "corridors", label: "Corridors", render: (row) => row.corridorCount || 0 },
            {
              key: "actions",
              label: "",
              render: (row) => (
                <div className="flex justify-end gap-2">
                  {can(PERMISSIONS.EXPORT_MARKETS_UPDATE) ? (
                    <Link href={`/export/markets/${row.id}/edit`}>
                      <Button size="sm" variant="outline">
                        Edit
                      </Button>
                    </Link>
                  ) : null}
                  {can(PERMISSIONS.EXPORT_MARKETS_DELETE) ? (
                    <Button size="sm" variant="ghost" onClick={() => setPendingDelete(row)}>
                      Delete
                    </Button>
                  ) : null}
                </div>
              ),
            },
          ]}
          rows={data.items}
        />
        <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPage={setPage} />
      </Card>
      <ConfirmationDialog
        open={Boolean(pendingDelete)}
        title="Delete market"
        description={`Delete ${pendingDelete?.name}? This can be restored only from the database.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
