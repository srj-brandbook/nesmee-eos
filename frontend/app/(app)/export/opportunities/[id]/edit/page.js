"use client";

import { useParams } from "next/navigation";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { OpportunityForm } from "@/components/export/PipelineScreens";
import { PERMISSIONS } from "@/constants/permissions";

export default function EditOpportunityPage() {
  const { id } = useParams();
  return (
    <PermissionGate permission={PERMISSIONS.EXPORT_OPPORTUNITIES_UPDATE}>
      <OpportunityForm opportunityId={id} />
    </PermissionGate>
  );
}
