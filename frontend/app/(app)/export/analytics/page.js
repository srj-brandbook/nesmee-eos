"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { AnalyticsScreen } from "@/components/export/IntelligenceScreens";
import { PERMISSIONS } from "@/constants/permissions";

export default function AnalyticsPage() {
  return (
    <PermissionGate permission={PERMISSIONS.EXPORT_ANALYTICS_VIEW}>
      <AnalyticsScreen />
    </PermissionGate>
  );
}
