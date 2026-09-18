"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { CorridorBuilder } from "@/components/export/CorridorScreens";
import { PERMISSIONS } from "@/constants/permissions";
import { Spinner } from "@/components/ui/Spinner";

export default function EditCorridorPage() {
  const { id } = useParams();
  return (
    <PermissionGate permission={PERMISSIONS.EXPORT_CORRIDORS_UPDATE}>
      <Suspense fallback={<Spinner />}>
        <CorridorBuilder corridorId={id} />
      </Suspense>
    </PermissionGate>
  );
}
