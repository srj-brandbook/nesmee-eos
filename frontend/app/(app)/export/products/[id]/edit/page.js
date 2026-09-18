"use client";

import { useParams } from "next/navigation";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { ProductForm } from "@/components/export/ProductScreens";
import { PERMISSIONS } from "@/constants/permissions";

export default function EditProductPage() {
  const { id } = useParams();
  return (
    <PermissionGate permission={PERMISSIONS.EXPORT_PRODUCTS_UPDATE}>
      <ProductForm productId={id} />
    </PermissionGate>
  );
}
