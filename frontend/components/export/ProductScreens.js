"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { exportService } from "@/services/exportService";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { usePagination } from "@/hooks/usePagination";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Table } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { Alert } from "@/components/ui/Alert";
import { PERMISSIONS } from "@/constants/permissions";
import { PRODUCT_STATUSES, labelFor, statusVariant } from "@/constants/export";
import { LookupSelect } from "./ExportSelects";
import { ApiClientError } from "@/lib/api/apiClient";

export function ProductTable() {
  const { can } = useAuth();
  const toast = useToast();
  const { value, setValue, debounced } = useDebouncedSearch();
  const { page, setPage, limit } = usePagination({ page: 1, limit: 50 });
  const [data, setData] = useState({ items: [], pagination: { page: 1, totalPages: 1 } });
  const [pendingDelete, setPendingDelete] = useState(null);

  async function load() {
    const response = await exportService.products.list({ search: debounced, page, limit, sort: "name" });
    setData(response.data);
  }
  useEffect(() => {
    load().catch(() => toast.error("Unable to load products"));
  }, [debounced, page, limit]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Export products</h1>
          <p className="text-sm text-muted">Catalog used for market eligibility and landed cost.</p>
        </div>
        {can(PERMISSIONS.EXPORT_PRODUCTS_CREATE) ? (
          <Link href="/export/products/new">
            <Button>
              <Plus className="h-4 w-4" />
              New product
            </Button>
          </Link>
        ) : null}
      </div>
      <Input label="Search" value={value} onChange={(event) => { setValue(event.target.value); setPage(1); }} placeholder="Name, SKU, HS code" />
      <Card>
        <Table
          empty="No products yet."
          rows={data.items}
          columns={[
            { key: "name", label: "Product", render: (row) => <Link className="font-medium text-primary" href={`/export/products/${row.id}/edit`}>{row.name}</Link> },
            { key: "sku", label: "SKU" },
            { key: "hsCode", label: "HS code" },
            { key: "category", label: "Category" },
            { key: "status", label: "Status", render: (row) => <Badge variant={statusVariant(row.status)}>{labelFor(PRODUCT_STATUSES, row.status)}</Badge> },
            {
              key: "actions",
              label: "",
              render: (row) =>
                can(PERMISSIONS.EXPORT_PRODUCTS_DELETE) ? (
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
          await exportService.products.remove(pendingDelete.id);
          toast.success("Product deleted");
          setPendingDelete(null);
          await load();
        }}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}

const emptyProduct = { name: "", sku: "", hsCode: "", category: "", unit: "unit", status: "active", baseCost: 0, baseCurrency: "INR", notes: "" };

export function ProductForm({ productId }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(emptyProduct);
  const [error, setError] = useState("");
  const [fields, setFields] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productId) return;
    exportService.products.get(productId).then((response) => setForm({ ...emptyProduct, ...response.data.product }));
  }, [productId]);

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (productId) {
        await exportService.products.update(productId, form);
        toast.success("Product updated");
      } else {
        await exportService.products.create(form);
        toast.success("Product created");
      }
      router.push("/export/products");
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
        setFields(err.fields || {});
      } else setError("Could not save product");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <h1 className="font-display text-2xl font-semibold">{productId ? "Edit product" : "New product"}</h1>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <Card>
        <CardHeader>Product</CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Input label="Name" requiredMark value={form.name} error={fields.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <Input label="SKU" value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} />
          <Input label="HS code" value={form.hsCode} onChange={(event) => setForm({ ...form, hsCode: event.target.value })} />
          <LookupSelect type="product_category" label="Category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
          <Input label="Unit" value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} />
          <Select label="Status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
            {PRODUCT_STATUSES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </Select>
          <Input type="number" label="Base cost" value={form.baseCost} onChange={(event) => setForm({ ...form, baseCost: Number(event.target.value) })} />
          <LookupSelect type="currency" label="Currency" value={form.baseCurrency} onChange={(event) => setForm({ ...form, baseCurrency: event.target.value })} />
          <div className="md:col-span-2">
            <Textarea label="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </div>
        </CardBody>
      </Card>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" loading={loading}>Save product</Button>
      </div>
    </form>
  );
}
