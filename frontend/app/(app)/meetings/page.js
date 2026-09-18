"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { ActivityWorkspace } from "@/components/crm/ActivityWorkspace";
import { PERMISSIONS } from "@/constants/permissions";

export default function MeetingsPage() {
  return (
    <PermissionGate permission={PERMISSIONS.ACTIVITIES_VIEW}>
      <ActivityWorkspace
        type="meeting"
        title="Meetings"
        description="Video and conference calls with manufacturers, visible to everyone with access."
      />
    </PermissionGate>
  );
}
