"use client";

import { useParams } from "next/navigation";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { MarketDetail } from "@/components/export/MarketDetail";
import { PERMISSIONS } from "@/constants/permissions";

export default function MarketDetailPage() {
  const { id } = useParams();
  return (
    <PermissionGate permission={PERMISSIONS.EXPORT_MARKETS_VIEW}>
      <MarketDetail marketId={id} />
    </PermissionGate>
  );
}
