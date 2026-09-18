"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { ActivityWorkspace } from "@/components/crm/ActivityWorkspace";
import { PERMISSIONS } from "@/constants/permissions";

export default function FollowUpsPage() {
  return (
    <PermissionGate permission={PERMISSIONS.ACTIVITIES_VIEW}>
      <ActivityWorkspace
        type="follow_up"
        title="Follow-ups & reminders"
        description="Chase samples, pricing, and decisions. Reminders include every process type, not only your own."
        showReminders
      />
    </PermissionGate>
  );
}
