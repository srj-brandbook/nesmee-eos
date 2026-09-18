"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { OnboardingInbox } from "@/components/onboarding/OnboardingInbox";
import { PERMISSIONS } from "@/constants/permissions";

export default function OnboardingPage() {
  return (
    <PermissionGate permission={PERMISSIONS.FORMS_VIEW}>
      <OnboardingInbox />
    </PermissionGate>
  );
}
