"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { RoleForm } from "@/components/roles/RoleForm";
import { PERMISSIONS } from "@/constants/permissions";

export default function NewRolePage() {
  return (
    <PermissionGate permission={PERMISSIONS.ROLES_CREATE}>
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-semibold">Create role</h1>
        <RoleForm />
      </div>
    </PermissionGate>
  );
}
