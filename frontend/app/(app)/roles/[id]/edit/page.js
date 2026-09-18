"use client";

import { useParams } from "next/navigation";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { RoleForm } from "@/components/roles/RoleForm";
import { PERMISSIONS } from "@/constants/permissions";

export default function EditRolePage() {
  const { id } = useParams();
  return (
    <PermissionGate permission={PERMISSIONS.ROLES_UPDATE}>
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-semibold">Edit role</h1>
        <RoleForm roleId={id} />
      </div>
    </PermissionGate>
  );
}
