"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { BillingDashboard } from "@/components/billing/BillingDashboard";
import { PERMISSIONS } from "@/constants/permissions";

export default function BillingPage() {
  return (
    <PermissionGate permission={PERMISSIONS.SERVICES_JOBS_VIEW}>
      <BillingDashboard />
    </PermissionGate>
  );
}
