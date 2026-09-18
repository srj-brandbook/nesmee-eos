"use client";

import { useParams } from "next/navigation";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { UserForm } from "@/components/users/UserForm";
import { PERMISSIONS } from "@/constants/permissions";

export default function EditUserPage() {
  const { id } = useParams();
  return (
    <PermissionGate permission={PERMISSIONS.USERS_UPDATE}>
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-semibold">Edit user</h1>
        <UserForm userId={id} />
      </div>
    </PermissionGate>
  );
}
