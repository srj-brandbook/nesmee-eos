import { useAuth } from "@/contexts/AuthProvider";

export function usePermission(permission) {
  const { can } = useAuth();
  return can(permission);
}
