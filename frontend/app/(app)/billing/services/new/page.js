"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { ServiceForm } from "@/components/billing/ServiceForm";
import { PERMISSIONS } from "@/constants/permissions";

export default function NewServicePage() {
  return (
    <PermissionGate permission={PERMISSIONS.SERVICES_CREATE}>
      <ServiceForm />
    </PermissionGate>
  );
}
