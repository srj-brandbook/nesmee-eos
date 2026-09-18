"use client";

import { useParams } from "next/navigation";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { PaymentPrintView } from "@/components/billing/PaymentPrintView";
import { PERMISSIONS } from "@/constants/permissions";

export default function PaymentPrintPage() {
  const { id } = useParams();
  return (
    <PermissionGate permission={PERMISSIONS.PAYMENTS_VIEW}>
      <PaymentPrintView paymentId={id} />
    </PermissionGate>
  );
}
