"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { LeadForm } from "@/components/crm/LeadForm";
import { PERMISSIONS } from "@/constants/permissions";

export default function NewLeadPage() {
  return (
    <PermissionGate permission={PERMISSIONS.LEADS_CREATE}>
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-semibold">New manufacturer lead</h1>
        <p className="text-sm text-muted">Add a factory and optional primary contact, then work the sourcing process.</p>
        <LeadForm />
      </div>
    </PermissionGate>
  );
}
