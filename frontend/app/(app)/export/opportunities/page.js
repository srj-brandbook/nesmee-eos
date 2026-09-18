"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { OpportunityWorkspace } from "@/components/export/PipelineScreens";
import { PERMISSIONS } from "@/constants/permissions";

export default function OpportunitiesPage() {
  return (
    <PermissionGate permission={PERMISSIONS.EXPORT_OPPORTUNITIES_VIEW}>
      <OpportunityWorkspace />
    </PermissionGate>
  );
}
