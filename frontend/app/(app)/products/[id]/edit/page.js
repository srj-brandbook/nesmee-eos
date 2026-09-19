"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { ProductForm } from "@/components/products/ProductForm";
import { PERMISSIONS } from "@/constants/permissions";

export default function EditProductPage() {
  const { id } = useParams();
  return (
    <PermissionGate permission={PERMISSIONS.PRODUCTS_UPDATE}>
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <ProductForm productId={id} />
      </Suspense>
    </PermissionGate>
  );
}
