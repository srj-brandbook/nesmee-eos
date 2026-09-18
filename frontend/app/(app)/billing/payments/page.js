"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { PaymentTable } from "@/components/billing/PaymentTable";
import { PERMISSIONS } from "@/constants/permissions";

export default function PaymentsPage() {
  return (
    <PermissionGate permission={PERMISSIONS.PAYMENTS_VIEW}>
      <PaymentTable />
    </PermissionGate>
  );
}
