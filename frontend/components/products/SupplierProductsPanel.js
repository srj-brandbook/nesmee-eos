"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { productService } from "@/services/productService";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Alert";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { labelFor, PRODUCT_LISTING_STATUSES, PRODUCT_STATUSES, listingStatusVariant } from "@/constants/products";

export function SupplierProductsPanel({ supplierId, canCreate, blockedReason }) {
  const { can } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!supplierId || !can(PERMISSIONS.PRODUCTS_VIEW)) return;
    productService
      .list({ supplierId, limit: 50, sort: "-updatedAt" })
      .then((response) => setItems(response.data.items || []))
      .catch(() => toast.error("Unable to load products"));
  }, [supplierId]);

  if (!can(PERMISSIONS.PRODUCTS_VIEW)) return null;

  const listed = items.filter((item) => item.listingStatus === "listed").length;

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Catalog</h2>
          <p className="mt-1 text-sm text-muted">
            {items.length
              ? `${listed} listed · ${items.length} product${items.length === 1 ? "" : "s"}`
              : "SKUs this supplier can export."}
          </p>
        </div>
        {canCreate && can(PERMISSIONS.PRODUCTS_CREATE) ? (
          <Link href={`${ROUTES.products}/new?supplierId=${supplierId}`}>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              New product
            </Button>
          </Link>
        ) : null}
      </CardHeader>
      <CardBody className="space-y-2">
        {blockedReason && !canCreate ? <Alert variant="warning">{blockedReason}</Alert> : null}
        {items.length ? (
          items.map((item) => (
            <Link
              key={item.id}
              href={`${ROUTES.products}/${item.id}`}
              className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 hover:border-primary"
            >
              <div className="min-w-0">
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-muted">{[item.sku, item.category].filter(Boolean).join(" · ") || "No SKU yet"}</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                {item.status && item.status !== "verified" ? (
                  <Badge variant={item.status === "rejected" || item.status === "archived" ? "danger" : "warning"}>
                    {labelFor(PRODUCT_STATUSES, item.status)}
                  </Badge>
                ) : null}
                <Badge variant={listingStatusVariant(item.listingStatus)}>
                  {labelFor(PRODUCT_LISTING_STATUSES, item.listingStatus)}
                </Badge>
              </div>
            </Link>
          ))
        ) : (
          <EmptyState
            className="px-2 py-10"
            title="No products yet"
            description={
              canCreate
                ? "Add the first SKU so distributors can see what this factory can supply."
                : blockedReason || "Products appear here once they are created for this supplier."
            }
          />
        )}
      </CardBody>
    </Card>
  );
}
