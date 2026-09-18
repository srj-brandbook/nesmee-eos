"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { InvoiceTable } from "@/components/billing/InvoiceTable";
import { PERMISSIONS } from "@/constants/permissions";

export default function InvoicesPage() {
  return (
    <PermissionGate permission={PERMISSIONS.INVOICES_VIEW}>
      <InvoiceTable />
    </PermissionGate>
  );
}
