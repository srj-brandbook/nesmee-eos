"use client";

import { useAuth } from "@/contexts/AuthProvider";

export function Can({ permission, children, fallback = null }) {
  const { can } = useAuth();
  if (!can(permission)) return fallback;
  return children;
}
