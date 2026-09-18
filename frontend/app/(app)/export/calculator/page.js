"use client";

import { Suspense } from "react";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { LandedCostCalculator } from "@/components/export/CalculatorScreen";
import { PERMISSIONS } from "@/constants/permissions";
import { Spinner } from "@/components/ui/Spinner";

export default function CalculatorPage() {
  return (
    <PermissionGate permission={PERMISSIONS.EXPORT_CALCULATOR_VIEW}>
      <Suspense fallback={<Spinner />}>
        <LandedCostCalculator />
      </Suspense>
    </PermissionGate>
  );
}
