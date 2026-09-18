"use client";

import { useParams } from "next/navigation";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { UserDetail } from "@/components/users/UserDetail";
import { PERMISSIONS } from "@/constants/permissions";

export default function UserDetailPage() {
  const { id } = useParams();
  return (
    <PermissionGate permission={PERMISSIONS.USERS_VIEW}>
      <UserDetail userId={id} />
    </PermissionGate>
  );
}
