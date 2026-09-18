"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { VerificationWorkspace } from "@/components/verification/VerificationWorkspace";
import { PERMISSIONS } from "@/constants/permissions";

export default function VerificationCasePage() {
  return (
    <PermissionGate permission={PERMISSIONS.VERIFICATION_VIEW}>
      <VerificationWorkspace />
    </PermissionGate>
  );
}
