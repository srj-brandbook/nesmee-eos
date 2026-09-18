"use client";

import { useParams } from "next/navigation";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { CorridorDetail } from "@/components/export/CorridorScreens";
import { PERMISSIONS } from "@/constants/permissions";

export default function CorridorDetailPage() {
  const { id } = useParams();
  return (
    <PermissionGate permission={PERMISSIONS.EXPORT_CORRIDORS_VIEW}>
      <CorridorDetail corridorId={id} />
    </PermissionGate>
  );
}
