"use client";

import { useParams } from "next/navigation";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { ProductWorkspace } from "@/components/products/ProductWorkspace";
import { PERMISSIONS } from "@/constants/permissions";

export default function ProductDetailPage() {
  const { id } = useParams();
  return (
    <PermissionGate permission={PERMISSIONS.PRODUCTS_VIEW}>
      <ProductWorkspace productId={id} />
    </PermissionGate>
  );
}
