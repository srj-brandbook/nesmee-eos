"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { VerificationReviewWorkspace } from "@/components/verification/VerificationReviewWorkspace";
import { PERMISSIONS } from "@/constants/permissions";

export default function VerificationReviewPage() {
  return (
    <PermissionGate permission={PERMISSIONS.VERIFICATION_REVIEW}>
      <VerificationReviewWorkspace />
    </PermissionGate>
  );
}
