"use client";

import { useParams } from "next/navigation";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { BuyerForm } from "@/components/export/PipelineScreens";
import { PERMISSIONS } from "@/constants/permissions";

export default function EditDistributorPage() {
  const { id } = useParams();
  return (
    <PermissionGate permission={PERMISSIONS.EXPORT_BUYERS_UPDATE}>
      <BuyerForm buyerId={id} />
    </PermissionGate>
  );
}
