"use client";

import { useParams } from "next/navigation";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { InvoiceEditor } from "@/components/billing/InvoiceEditor";
import { PERMISSIONS } from "@/constants/permissions";

export default function InvoiceDetailPage() {
  const { id } = useParams();
  return (
    <PermissionGate permission={PERMISSIONS.INVOICES_VIEW}>
      <InvoiceEditor invoiceId={id} />
    </PermissionGate>
  );
}
