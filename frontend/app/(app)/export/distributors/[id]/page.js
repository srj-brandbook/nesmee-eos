"use client";

import { useParams } from "next/navigation";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { BuyerDetail } from "@/components/export/BuyerDetail";
import { PERMISSIONS } from "@/constants/permissions";

export default function DistributorDetailPage() {
  const { id } = useParams();
  return (
    <PermissionGate permission={PERMISSIONS.EXPORT_BUYERS_VIEW}>
      <BuyerDetail buyerId={id} />
    </PermissionGate>
  );
}
