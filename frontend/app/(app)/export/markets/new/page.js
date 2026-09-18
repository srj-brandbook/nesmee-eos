"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { MarketForm } from "@/components/export/MarketForm";
import { PERMISSIONS } from "@/constants/permissions";

export default function NewMarketPage() {
  return (
    <PermissionGate permission={PERMISSIONS.EXPORT_MARKETS_CREATE}>
      <MarketForm />
    </PermissionGate>
  );
}
