"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { Spinner } from "@/components/ui/Spinner";

export function PermissionGate({ permission, children }) {
  const { can, loading } = useAuth();
  const router = useRouter();
  const allowed = can(permission);

  useEffect(() => {
    if (!loading && !allowed) router.replace("/forbidden");
  }, [allowed, loading, router]);

  if (loading || !allowed) return <Spinner />;
  return children;
}
