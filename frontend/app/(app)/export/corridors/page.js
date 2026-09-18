"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { CorridorTable } from "@/components/export/CorridorScreens";
import { PERMISSIONS } from "@/constants/permissions";

export default function CorridorsPage() {
  return (
    <PermissionGate permission={PERMISSIONS.EXPORT_CORRIDORS_VIEW}>
      <CorridorTable />
    </PermissionGate>
  );
}
