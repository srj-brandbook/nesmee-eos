"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { VerificationInbox } from "@/components/verification/VerificationInbox";
import { PERMISSIONS } from "@/constants/permissions";

export default function VerificationPage() {
  return (
    <PermissionGate permission={PERMISSIONS.VERIFICATION_VIEW}>
      <VerificationInbox />
    </PermissionGate>
  );
}
