"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { UsersTable } from "@/components/users/UsersTable";
import { PERMISSIONS } from "@/constants/permissions";

export default function UsersPage() {
  return (
    <PermissionGate permission={PERMISSIONS.USERS_VIEW}>
      <UsersTable />
    </PermissionGate>
  );
}
