"use client";

import { AppShell } from "@/components/layout/AppShell";
import { DashboardSkeleton } from "@/components/layout/DashboardSkeleton";
import { useAuth } from "@/contexts/AuthProvider";

export default function AppLayout({ children }) {
  const { loading, user } = useAuth();
  if (loading || !user) {
    return <DashboardSkeleton />;
  }
  return <AppShell>{children}</AppShell>;
}
