"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { productService } from "@/services/productService";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";

export function DistributorProductsPanel({ buyerId }) {
  const { can } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!buyerId || !can(PERMISSIONS.PRODUCTS_VIEW)) return;
    productService
      .listShares({ buyerId, status: "shared", limit: 50 })
      .then((response) => setItems(response.data.items || []))
      .catch(() => toast.error("Unable to load shared products"));
  }, [buyerId]);

  if (!can(PERMISSIONS.PRODUCTS_VIEW)) return null;

  return (
    <Card>
      <CardHeader>Shared products</CardHeader>
      <CardBody className="space-y-2">
        {items.length ? (
          items.map((item) => (
            <Link key={item.id} href={`${ROUTES.products}/${item.productId}`} className="flex items-center gap-3 rounded-md border border-border px-3 py-2 hover:border-primary">
              {item.product?.thumbnail?.url ? (
                <img src={item.product.thumbnail.url} alt="" className="h-10 w-10 rounded object-cover" />
              ) : (
                <div className="h-10 w-10 rounded bg-slate-100 dark:bg-slate-800" />
              )}
              <div>
                <p className="font-medium">{item.product?.name || "Product"}</p>
                <p className="text-xs text-muted">{item.product?.supplier?.name || item.product?.sku || "—"}</p>
              </div>
            </Link>
          ))
        ) : (
          <p className="text-sm text-muted">No listed products have been shared with this distributor.</p>
        )}
      </CardBody>
    </Card>
  );
}
