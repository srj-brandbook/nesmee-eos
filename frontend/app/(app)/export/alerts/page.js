"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { AlertsScreen } from "@/components/export/IntelligenceScreens";
import { PERMISSIONS } from "@/constants/permissions";

export default function ExportAlertsPage() {
  return (
    <PermissionGate permission={PERMISSIONS.EXPORT_ALERTS_VIEW}>
      <AlertsScreen />
    </PermissionGate>
  );
}
