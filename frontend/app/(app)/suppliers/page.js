"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { SupplierTable } from "@/components/crm/SupplierTable";
import { PERMISSIONS } from "@/constants/permissions";

export default function SuppliersPage() {
  return (
    <PermissionGate permission={PERMISSIONS.LEADS_VIEW}>
      <SupplierTable />
    </PermissionGate>
  );
}
