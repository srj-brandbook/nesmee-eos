"use client";

import { useParams } from "next/navigation";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { SupplierDetail } from "@/components/crm/SupplierDetail";
import { PERMISSIONS } from "@/constants/permissions";

export default function SupplierDetailPage() {
  const { id } = useParams();
  return (
    <PermissionGate permission={PERMISSIONS.LEADS_VIEW}>
      <SupplierDetail supplierId={id} />
    </PermissionGate>
  );
}
