"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { ActivityWorkspace } from "@/components/crm/ActivityWorkspace";
import { PERMISSIONS } from "@/constants/permissions";

export default function AppointmentsPage() {
  return (
    <PermissionGate permission={PERMISSIONS.ACTIVITIES_VIEW}>
      <ActivityWorkspace
        type="appointment"
        title="Appointments"
        description="Factory visits and in-person meetings for the whole sourcing team."
      />
    </PermissionGate>
  );
}
