"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { exportService } from "@/services/exportService";
import { ExportOwnerSelect } from "./ExportSelects";
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
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { BUYER_STATUSES, labelFor, statusVariant } from "@/constants/export";
import { ApiClientError } from "@/lib/api/apiClient";

export function DistributorTable() {
  const { can } = useAuth();
  const toast = useToast();
  const { value, setValue, debounced } = useDebouncedSearch();
  const { page, setPage, limit } = usePagination({ page: 1, limit: 50 });
  const [status, setStatus] = useState("");
  const [marketId, setMarketId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [markets, setMarkets] = useState([]);
  const [data, setData] = useState({ items: [], pagination: { page: 1, totalPages: 1 } });

  async function load() {
    const response = await exportService.buyers.list({
      search: debounced,
      status,
      marketId,
      ownerId,
      page,
      limit,
    });
    setData(response.data);
  }

  useEffect(() => {
    exportService.markets
      .list({ limit: 100 })
      .then((response) => setMarkets(response.data.items || []))
      .catch(() => setMarkets([]));
  }, []);

  useEffect(() => {
    load().catch(() => toast.error("Unable to load distributors"));
  }, [debounced, status, marketId, ownerId, page, limit]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Distributors</h1>
          <p className="text-sm text-muted">Destination partners mapped to export markets, including prospects still in onboarding.</p>
        </div>
        {can(PERMISSIONS.EXPORT_BUYERS_CREATE) ? (
          <Link href={`${ROUTES.exportDistributors}/new`}>
            <Button>
              <Plus className="h-4 w-4" />
              New distributor
            </Button>
          </Link>
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Input
          label="Search"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setPage(1);
          }}
        />
        <Select
          label="Status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {BUYER_STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
        <Select
          label="Market"
          value={marketId}
          onChange={(event) => {
            setMarketId(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All markets</option>
          {markets.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
        <ExportOwnerSelect
          label="Owner"
          value={ownerId}
          emptyLabel="All owners"
          onChange={(event) => {
            setOwnerId(event.target.value);
            setPage(1);
          }}
        />
      </div>
      <Card>
        <Table
          empty="No distributors yet"
          rows={data.items}
          columns={[
            {
              key: "name",
              label: "Distributor",
              render: (row) => (
                <Link className="font-medium text-primary hover:underline" href={`${ROUTES.exportDistributors}/${row.id}`}>
                  {row.name}
                </Link>
              ),
            },
            { key: "market", label: "Market", render: (row) => row.market?.name || "—" },
            { key: "country", label: "Country", render: (row) => row.country || row.market?.countryCode || "—" },
            {
              key: "owner",
              label: "Owner",
              render: (row) =>
                row.owner ? (
                  <span className="inline-flex" title={row.owner.name} aria-label={row.owner.name}>
                    <Avatar name={row.owner.name} src={row.owner.avatarUrl} size={32} />
                  </span>
                ) : (
                  <span className="text-muted">—</span>
                ),
            },
            { key: "segment", label: "Segment", render: (row) => row.segment || "—" },
            {
              key: "status",
              label: "Status",
              render: (row) => <Badge variant={statusVariant(row.status)}>{labelFor(BUYER_STATUSES, row.status)}</Badge>,
            },
            {
              key: "onboarding",
              label: "",
              render: (row) =>
                can(PERMISSIONS.EXPORT_BUYERS_UPDATE) && row.status !== "inactive" ? (
                  <button
                    type="button"
                    className="text-sm text-primary"
                    onClick={async () => {
                      try {
                        const response = await exportService.buyers.startOnboarding(row.id);
                        toast.success("Onboarding started");
                        if (response.data.onboarding?.id) window.location.href = `/onboarding/${response.data.onboarding.id}`;
                      } catch (err) {
                        toast.error(err instanceof ApiClientError ? err.message : "Could not start onboarding");
                      }
                    }}
                  >
                    {row.status === "onboarding" ? "Continue onboarding" : "Start onboarding"}
                  </button>
                ) : null,
            },
          ]}
        />
        <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPage={setPage} />
      </Card>
    </div>
  );
}
