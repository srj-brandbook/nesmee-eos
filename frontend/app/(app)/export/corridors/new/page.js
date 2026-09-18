"use client";

import { Suspense } from "react";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { CorridorBuilder } from "@/components/export/CorridorScreens";
import { PERMISSIONS } from "@/constants/permissions";
import { Spinner } from "@/components/ui/Spinner";

export default function NewCorridorPage() {
  return (
    <PermissionGate permission={PERMISSIONS.EXPORT_CORRIDORS_CREATE}>
      <Suspense fallback={<Spinner />}>
        <CorridorBuilder />
      </Suspense>
    </PermissionGate>
  );
}
