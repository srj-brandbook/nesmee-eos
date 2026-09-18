"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { CorridorCompare } from "@/components/export/CompareScreens";
import { PERMISSIONS } from "@/constants/permissions";

export default function CorridorComparePage() {
  return (
    <PermissionGate permission={PERMISSIONS.EXPORT_CORRIDORS_COMPARE}>
      <CorridorCompare />
    </PermissionGate>
  );
}
