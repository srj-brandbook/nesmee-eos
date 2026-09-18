"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { ActivityWorkspace } from "@/components/crm/ActivityWorkspace";
import { PERMISSIONS } from "@/constants/permissions";

export default function TasksPage() {
  return (
    <PermissionGate permission={PERMISSIONS.ACTIVITIES_VIEW}>
      <ActivityWorkspace
        type="task"
        title="Task manager"
        description="Open work across the sourcing team — sample requests, cert checks, and follow-through."
      />
    </PermissionGate>
  );
}
