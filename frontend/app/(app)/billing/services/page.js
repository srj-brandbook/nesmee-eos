"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { ServiceCatalog } from "@/components/billing/ServiceCatalog";
import { PERMISSIONS } from "@/constants/permissions";

export default function BillingServicesPage() {
  return (
    <PermissionGate permission={PERMISSIONS.SERVICES_VIEW}>
      <ServiceCatalog />
    </PermissionGate>
  );
}
