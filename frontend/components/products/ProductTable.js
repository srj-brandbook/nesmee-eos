"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { productService } from "@/services/productService";
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
import { Card } from "@/components/ui/Card";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { labelFor, PRODUCT_STATUSES, PRODUCT_LISTING_STATUSES, productStatusVariant, listingStatusVariant } from "@/constants/products";
import { labelFor as verificationLabel, LEAD_VERIFICATION_STATUSES, verificationStatusVariant } from "@/constants/verification";

export function ProductTable({ supplierId, listing }) {
  const { can } = useAuth();
  const toast = useToast();
  const { value, setValue, debounced } = useDebouncedSearch();
  const { page, setPage, limit } = usePagination({ page: 1, limit: 50 });
  const [status, setStatus] = useState("");
  const [listingStatus, setListingStatus] = useState(listing || "");
  const [data, setData] = useState({ items: [], pagination: { page: 1, totalPages: 1 } });
  const [pendingDelete, setPendingDelete] = useState(null);

  async function load() {
    const response = await productService.list({
      search: debounced,
      page,
      limit,
      sort: "-updatedAt",
      status: status || undefined,
      listingStatus: listingStatus || undefined,
      supplierId: supplierId || undefined,
    });
    setData(response.data);
  }

  useEffect(() => {
    load().catch(() => toast.error("Unable to load products"));
  }, [debounced, page, limit, status, listingStatus, supplierId]);

  const newHref = supplierId ? `${ROUTES.products}/new?supplierId=${supplierId}` : `${ROUTES.products}/new`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted">Catalog from verified suppliers. Verified products can be listed and shared with distributors.</p>
        </div>
        {can(PERMISSIONS.PRODUCTS_CREATE) ? (
          <Link href={newHref}>
            <Button>
              <Plus className="h-4 w-4" />
              New product
            </Button>
          </Link>
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Input label="Search" value={value} onChange={(event) => { setValue(event.target.value); setPage(1); }} placeholder="Name, SKU, HS code, brand" />
        <Select label="Status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {PRODUCT_STATUSES.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </Select>
        <Select label="Listing" value={listingStatus} onChange={(event) => { setListingStatus(event.target.value); setPage(1); }}>
          <option value="">All listings</option>
          {PRODUCT_LISTING_STATUSES.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </Select>
      </div>
      <Card>
        <Table
          empty="No products yet."
          rows={data.items}
          columns={[
            {
              key: "name",
              label: "Product",
              render: (row) => (
                <div className="flex items-center gap-3">
                  {row.thumbnail?.url ? (
                    <img src={row.thumbnail.url} alt="" className="h-10 w-10 rounded-md object-cover bg-slate-100" />
                  ) : (
                    <div className="h-10 w-10 rounded-md bg-slate-100 dark:bg-slate-800" />
                  )}
                  <div>
                    <Link className="font-medium text-primary" href={`${ROUTES.products}/${row.id}`}>{row.name}</Link>
                    <p className="text-xs text-muted">{row.brand || row.category || "—"}</p>
                  </div>
                </div>
              ),
            },
            { key: "supplier", label: "Supplier", render: (row) => row.supplier?.name || "—" },
            { key: "sku", label: "SKU", render: (row) => row.sku || "—" },
            {
              key: "verificationStatus",
              label: "Verification",
              render: (row) => (
                <Badge variant={verificationStatusVariant(row.verificationStatus)}>
                  {row.origin === "migrated" && row.verificationStatus === "none" ? "Legacy" : verificationLabel(LEAD_VERIFICATION_STATUSES, row.verificationStatus)}
                </Badge>
              ),
            },
            {
              key: "listingStatus",
              label: "Listing",
              render: (row) => <Badge variant={listingStatusVariant(row.listingStatus)}>{labelFor(PRODUCT_LISTING_STATUSES, row.listingStatus)}</Badge>,
            },
            {
              key: "status",
              label: "Status",
              render: (row) => <Badge variant={productStatusVariant(row.status)}>{labelFor(PRODUCT_STATUSES, row.status)}</Badge>,
            },
            {
              key: "actions",
              label: "",
              render: (row) =>
                can(PERMISSIONS.PRODUCTS_DELETE) ? (
                  <Button size="sm" variant="ghost" onClick={() => setPendingDelete(row)}>
                    Delete
                  </Button>
                ) : null,
            },
          ]}
        />
        <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPage={setPage} />
      </Card>
      <ConfirmationDialog
        open={Boolean(pendingDelete)}
        title="Delete product"
        description={`Delete ${pendingDelete?.name}?`}
        onConfirm={async () => {
          await productService.remove(pendingDelete.id);
          toast.success("Product deleted");
          setPendingDelete(null);
          await load();
        }}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
