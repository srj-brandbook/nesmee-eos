"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { CalendarView } from "@/components/crm/CalendarView";
import { PERMISSIONS } from "@/constants/permissions";

export default function CalendarPage() {
  return (
    <PermissionGate permission={PERMISSIONS.CALENDAR_VIEW}>
      <CalendarView />
    </PermissionGate>
  );
}
