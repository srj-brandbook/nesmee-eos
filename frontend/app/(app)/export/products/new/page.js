"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { ProductForm } from "@/components/export/ProductScreens";
import { PERMISSIONS } from "@/constants/permissions";

export default function NewProductPage() {
  return (
    <PermissionGate permission={PERMISSIONS.EXPORT_PRODUCTS_CREATE}>
      <ProductForm />
    </PermissionGate>
  );
}
