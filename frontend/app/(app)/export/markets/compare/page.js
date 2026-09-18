"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { MarketCompare } from "@/components/export/CompareScreens";
import { PERMISSIONS } from "@/constants/permissions";

export default function MarketComparePage() {
  return (
    <PermissionGate permission={PERMISSIONS.EXPORT_MARKETS_VIEW}>
      <MarketCompare />
    </PermissionGate>
  );
}
