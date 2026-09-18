"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { OpportunityForm } from "@/components/export/PipelineScreens";
import { PERMISSIONS } from "@/constants/permissions";

export default function NewOpportunityPage() {
  return (
    <PermissionGate permission={PERMISSIONS.EXPORT_OPPORTUNITIES_CREATE}>
      <OpportunityForm />
    </PermissionGate>
  );
}
