"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { DistributorTable } from "@/components/export/DistributorTable";
import { PERMISSIONS } from "@/constants/permissions";

export default function DistributorsPage() {
  return (
    <PermissionGate permission={PERMISSIONS.EXPORT_BUYERS_VIEW}>
      <DistributorTable />
    </PermissionGate>
  );
}
