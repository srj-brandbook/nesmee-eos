"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthProvider";
import { Spinner } from "@/components/ui/Spinner";
import { OnboardingFill } from "@/components/onboarding/OnboardingFill";
import { PERMISSIONS } from "@/constants/permissions";

export default function OnboardingFillPage() {
  const { can, loading } = useAuth();
  const router = useRouter();
  const allowed =
    can(PERMISSIONS.FORMS_SUBMIT) ||
    can(PERMISSIONS.FORMS_VIEW) ||
    can(PERMISSIONS.LEADS_CONVERT) ||
    can(PERMISSIONS.EXPORT_BUYERS_UPDATE);

  useEffect(() => {
    if (!loading && !allowed) router.replace("/forbidden");
  }, [allowed, loading, router]);

  if (loading || !allowed) return <Spinner />;
  return <OnboardingFill />;
}
