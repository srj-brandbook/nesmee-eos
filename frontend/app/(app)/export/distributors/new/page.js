"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { BuyerForm } from "@/components/export/PipelineScreens";
import { PERMISSIONS } from "@/constants/permissions";

export default function NewDistributorPage() {
  return (
    <PermissionGate permission={PERMISSIONS.EXPORT_BUYERS_CREATE}>
      <BuyerForm />
    </PermissionGate>
  );
}
