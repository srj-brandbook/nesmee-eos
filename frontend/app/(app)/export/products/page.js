"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { ProductTable } from "@/components/export/ProductScreens";
import { PERMISSIONS } from "@/constants/permissions";

export default function ProductsPage() {
  return (
    <PermissionGate permission={PERMISSIONS.EXPORT_PRODUCTS_VIEW}>
      <ProductTable />
    </PermissionGate>
  );
}
