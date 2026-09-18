"use client";

import { useSearchParams } from "next/navigation";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { JobForm } from "@/components/billing/JobForm";
import { PERMISSIONS } from "@/constants/permissions";

export default function NewJobPage() {
  const params = useSearchParams();
  return (
    <PermissionGate permission={PERMISSIONS.SERVICES_JOBS_CREATE}>
      <JobForm
        initialLeadId={params.get("leadId") || ""}
        initialOfferingId={params.get("offeringId") || ""}
        initialDocumentKey={params.get("documentKey") || ""}
        initialCaseId={params.get("caseId") || ""}
        initialSource={params.get("source") || "manual"}
      />
    </PermissionGate>
  );
}
