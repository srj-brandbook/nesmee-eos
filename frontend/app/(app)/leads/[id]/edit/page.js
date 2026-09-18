"use client";

import { useParams } from "next/navigation";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { LeadForm } from "@/components/crm/LeadForm";
import { PERMISSIONS } from "@/constants/permissions";

export default function EditLeadPage() {
  const { id } = useParams();
  return (
    <PermissionGate permission={PERMISSIONS.LEADS_UPDATE}>
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-semibold">Edit manufacturer</h1>
        <LeadForm leadId={id} />
      </div>
    </PermissionGate>
  );
}
