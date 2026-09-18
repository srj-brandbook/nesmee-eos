"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authService } from "@/services/authService";
import { can as canPermission } from "@/lib/permissions/can";
import { APP_PREFIXES } from "@/constants/routes";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const response = await authService.me();
      setUser(response.data.user);
      return response.data.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (loading) return;
    const isApp = APP_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    if (isApp && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    if (isApp && user?.status === "pending_verification" && pathname !== "/dashboard") {
      router.replace("/dashboard");
    }
  }, [loading, pathname, router, user]);

  const value = useMemo(
    () => ({
      user,
      loading,
      permissions: user?.permissions || [],
      refresh,
      setUser,
      can: (permission) =>
        Boolean(user?.roles?.some((role) => role.isSuperAdmin)) || canPermission(user?.permissions || [], permission),
      logout: async () => {
        try {
          await authService.logout();
        } finally {
          setUser(null);
          router.push("/login");
        }
      },
    }),
    [loading, refresh, router, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
