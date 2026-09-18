"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { JobTable } from "@/components/billing/JobTable";
import { PERMISSIONS } from "@/constants/permissions";

export default function BillingJobsPage() {
  return (
    <PermissionGate permission={PERMISSIONS.SERVICES_JOBS_VIEW}>
      <JobTable />
    </PermissionGate>
  );
}
