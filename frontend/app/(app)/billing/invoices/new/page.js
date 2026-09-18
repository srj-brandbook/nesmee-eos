"use client";

import { useSearchParams } from "next/navigation";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { InvoiceEditor } from "@/components/billing/InvoiceEditor";
import { PERMISSIONS } from "@/constants/permissions";

export default function NewInvoicePage() {
  const params = useSearchParams();
  return (
    <PermissionGate permission={PERMISSIONS.INVOICES_CREATE}>
      <InvoiceEditor initialLeadId={params.get("leadId") || ""} initialJobId={params.get("jobId") || ""} />
    </PermissionGate>
  );
}
