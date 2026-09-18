"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { leadService } from "@/services/crmService";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { usePagination } from "@/hooks/usePagination";
import { useToast } from "@/contexts/ToastProvider";
import { Table } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ROUTES } from "@/constants/routes";
import { formatDate } from "@/lib/utils";
import { labelFor, LEAD_VERIFICATION_STATUSES, verificationStatusVariant } from "@/constants/verification";

export function SupplierTable() {
  const toast = useToast();
  const { value, setValue, debounced } = useDebouncedSearch();
  const { page, setPage, limit } = usePagination({ page: 1, limit: 50 });
  const [data, setData] = useState({ items: [], pagination: { page: 1, totalPages: 1 } });

  useEffect(() => {
    leadService
      .list({ search: debounced, stage: "won", sort: "-wonAt", page, limit })
      .then((response) => setData(response.data))
      .catch(() => toast.error("Unable to load suppliers"));
  }, [debounced, page, limit]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Suppliers</h1>
        <p className="text-sm text-muted">Manufacturers that completed onboarding and were marked won.</p>
      </div>
      <Input
        label="Search"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setPage(1);
        }}
      />
      <Card>
        <Table
          empty="No onboarded suppliers yet"
          columns={[
            {
              key: "name",
              label: "Supplier",
              render: (row) => (
                <div>
                  <Link href={`${ROUTES.suppliers}/${row.id}`} className="font-medium text-primary hover:underline">
                    {row.name}
                  </Link>
                  {row.legalName ? <p className="mt-0.5 text-xs text-muted">{row.legalName}</p> : null}
                </div>
              ),
            },
            {
              key: "country",
              label: "Country",
              render: (row) => row.country || "—",
            },
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
            {
              key: "verificationStatus",
              label: "Verification",
              render: (row) => (
                <Badge variant={verificationStatusVariant(row.verificationStatus || "none")}>
                  {labelFor(LEAD_VERIFICATION_STATUSES, row.verificationStatus || "none")}
                </Badge>
              ),
            },
            {
              key: "wonAt",
              label: "Won",
              render: (row) => <span className="text-muted">{formatDate(row.wonAt)}</span>,
            },
            { key: "products", label: "Products", render: (row) => row.products || "—" },
          ]}
          rows={data.items}
        />
        <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPage={setPage} />
      </Card>
    </div>
  );
}
