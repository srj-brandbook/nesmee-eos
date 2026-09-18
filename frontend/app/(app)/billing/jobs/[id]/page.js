"use client";

import { useParams } from "next/navigation";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { JobWorkspace } from "@/components/billing/JobWorkspace";
import { PERMISSIONS } from "@/constants/permissions";

export default function JobDetailPage() {
  const { id } = useParams();
  return (
    <PermissionGate permission={PERMISSIONS.SERVICES_JOBS_VIEW}>
      <JobWorkspace jobId={id} />
    </PermissionGate>
  );
}
