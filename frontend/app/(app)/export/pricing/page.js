"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { PricingScreen } from "@/components/export/SettingsScreens";
import { PERMISSIONS } from "@/constants/permissions";

export default function PricingPage() {
  return (
    <PermissionGate permission={PERMISSIONS.EXPORT_PRICING_VIEW}>
      <PricingScreen />
    </PermissionGate>
  );
}
