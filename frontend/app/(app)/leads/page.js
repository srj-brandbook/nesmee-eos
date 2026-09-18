"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { LeadTable } from "@/components/crm/LeadTable";
import { PERMISSIONS } from "@/constants/permissions";

export default function LeadsPage() {
  return (
    <PermissionGate permission={PERMISSIONS.LEADS_VIEW}>
      <LeadTable />
    </PermissionGate>
  );
}
