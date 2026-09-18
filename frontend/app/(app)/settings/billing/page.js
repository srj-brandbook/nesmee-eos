"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { BillingSettingsScreen } from "@/components/billing/BillingSettingsScreen";
import { PERMISSIONS } from "@/constants/permissions";

export default function BillingSettingsPage() {
  return (
    <PermissionGate permission={PERMISSIONS.BILLING_SETTINGS_VIEW}>
      <BillingSettingsScreen />
    </PermissionGate>
  );
}
