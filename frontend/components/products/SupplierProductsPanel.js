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
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { labelFor, PRODUCT_LISTING_STATUSES, listingStatusVariant } from "@/constants/products";

export function SupplierProductsPanel({ supplierId, canCreate }) {
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

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-2">
        <span>Products</span>
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
        {items.length ? (
          items.map((item) => (
            <Link key={item.id} href={`${ROUTES.products}/${item.id}`} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 hover:border-primary">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-muted">{item.sku || item.category || "—"}</p>
              </div>
              <Badge variant={listingStatusVariant(item.listingStatus)}>{labelFor(PRODUCT_LISTING_STATUSES, item.listingStatus)}</Badge>
            </Link>
          ))
        ) : (
          <p className="text-sm text-muted">No catalog products for this supplier yet.</p>
        )}
      </CardBody>
    </Card>
  );
}
