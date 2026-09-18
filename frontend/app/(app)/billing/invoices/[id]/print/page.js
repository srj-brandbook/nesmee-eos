"use client";

import { useParams } from "next/navigation";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { InvoicePrintView } from "@/components/billing/InvoicePrintView";
import { PERMISSIONS } from "@/constants/permissions";

export default function InvoicePrintPage() {
  const { id } = useParams();
  return (
    <PermissionGate permission={PERMISSIONS.INVOICES_VIEW}>
      <InvoicePrintView invoiceId={id} />
    </PermissionGate>
  );
}
