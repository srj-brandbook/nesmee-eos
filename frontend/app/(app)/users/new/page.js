"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { UserForm } from "@/components/users/UserForm";
import { PERMISSIONS } from "@/constants/permissions";

export default function NewUserPage() {
  return (
    <PermissionGate permission={PERMISSIONS.USERS_CREATE}>
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-semibold">Create user</h1>
        <UserForm />
      </div>
    </PermissionGate>
  );
}
