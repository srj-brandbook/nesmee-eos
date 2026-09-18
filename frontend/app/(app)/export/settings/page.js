"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { ExportSettingsScreen } from "@/components/export/SettingsScreens";
import { PERMISSIONS } from "@/constants/permissions";

export default function ExportSettingsPage() {
  return (
    <PermissionGate permission={PERMISSIONS.EXPORT_SETTINGS_VIEW}>
      <ExportSettingsScreen />
    </PermissionGate>
  );
}
