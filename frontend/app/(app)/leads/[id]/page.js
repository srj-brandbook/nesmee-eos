"use client";

import { useParams } from "next/navigation";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { LeadDetail } from "@/components/crm/LeadDetail";
import { PERMISSIONS } from "@/constants/permissions";

export default function LeadDetailPage() {
  const { id } = useParams();
  return (
    <PermissionGate permission={PERMISSIONS.LEADS_VIEW}>
      <LeadDetail leadId={id} />
    </PermissionGate>
  );
}
