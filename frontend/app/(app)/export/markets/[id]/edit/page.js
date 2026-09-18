"use client";

import { useParams } from "next/navigation";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { MarketForm } from "@/components/export/MarketForm";
import { PERMISSIONS } from "@/constants/permissions";

export default function EditMarketPage() {
  const { id } = useParams();
  return (
    <PermissionGate permission={PERMISSIONS.EXPORT_MARKETS_UPDATE}>
      <MarketForm marketId={id} />
    </PermissionGate>
  );
}
