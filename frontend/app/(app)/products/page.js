"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { ProductTable } from "@/components/products/ProductTable";
import { PERMISSIONS } from "@/constants/permissions";

export default function ProductsPage() {
  return (
    <PermissionGate permission={PERMISSIONS.PRODUCTS_VIEW}>
      <ProductTable />
    </PermissionGate>
  );
}
