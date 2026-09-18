"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { MarketTable } from "@/components/export/MarketTable";
import { PERMISSIONS } from "@/constants/permissions";

export default function ExportMarketsPage() {
  return (
    <PermissionGate permission={PERMISSIONS.EXPORT_MARKETS_VIEW}>
      <MarketTable />
    </PermissionGate>
  );
}
