"use client";

import { Suspense } from "react";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { ProductForm } from "@/components/products/ProductForm";
import { PERMISSIONS } from "@/constants/permissions";

export default function NewProductPage() {
  return (
    <PermissionGate permission={PERMISSIONS.PRODUCTS_CREATE}>
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <ProductForm />
      </Suspense>
    </PermissionGate>
  );
}
