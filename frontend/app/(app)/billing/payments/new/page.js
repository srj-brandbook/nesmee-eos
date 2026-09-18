"use client";

import { useSearchParams } from "next/navigation";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { PaymentForm } from "@/components/billing/PaymentForm";
import { PERMISSIONS } from "@/constants/permissions";

export default function NewPaymentPage() {
  const params = useSearchParams();
  return (
    <PermissionGate permission={PERMISSIONS.PAYMENTS_CREATE}>
      <PaymentForm initialInvoiceId={params.get("invoiceId") || ""} />
    </PermissionGate>
  );
}
