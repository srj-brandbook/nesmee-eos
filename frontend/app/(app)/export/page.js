"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { ExportDashboard } from "@/components/export/ExportDashboard";
import { PERMISSIONS } from "@/constants/permissions";

export default function ExportDashboardPage() {
  return (
    <PermissionGate permission={PERMISSIONS.EXPORT_VIEW}>
      <ExportDashboard />
    </PermissionGate>
  );
}
