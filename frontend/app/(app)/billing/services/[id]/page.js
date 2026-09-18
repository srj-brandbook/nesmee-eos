"use client";

import { useParams } from "next/navigation";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { ServiceForm } from "@/components/billing/ServiceForm";
import { PERMISSIONS } from "@/constants/permissions";

export default function EditServicePage() {
  const { id } = useParams();
  return (
    <PermissionGate permission={PERMISSIONS.SERVICES_VIEW}>
      <ServiceForm serviceId={id} />
    </PermissionGate>
  );
}
