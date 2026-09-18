"use client";

import { useParams } from "next/navigation";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { PaymentDetail } from "@/components/billing/PaymentDetail";
import { PERMISSIONS } from "@/constants/permissions";

export default function PaymentDetailPage() {
  const { id } = useParams();
  return (
    <PermissionGate permission={PERMISSIONS.PAYMENTS_VIEW}>
      <PaymentDetail paymentId={id} />
    </PermissionGate>
  );
}
