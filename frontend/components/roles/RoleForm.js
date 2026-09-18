"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { PermissionMatrix } from "./PermissionMatrix";
import { permissionService } from "@/services/permissionService";
import { roleService } from "@/services/roleService";
import { useToast } from "@/contexts/ToastProvider";
import { ApiClientError } from "@/lib/api/apiClient";

export function RoleForm({ roleId }) {
  const router = useRouter();
  const toast = useToast();
  const [permissions, setPermissions] = useState([]);
  const [form, setForm] = useState({ name: "", description: "", permissionIds: [] });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    permissionService.list().then((response) => setPermissions(response.data.items)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!roleId) return;
    roleService.get(roleId).then((response) => {
      const role = response.data.role;
      setForm({
        name: role.name,
        description: role.description,
        permissionIds: role.permissionIds,
      });
    });
  }, [roleId]);

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (roleId) {
        await roleService.update(roleId, form);
        toast.success("Role updated");
        router.push(`/roles/${roleId}`);
      } else {
        await roleService.create(form);
        toast.success("Role created");
        router.push("/roles");
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <div className="max-w-xl space-y-4">
        <Input label="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        <Textarea label="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      </div>
      <PermissionMatrix
        permissions={permissions}
        selected={form.permissionIds}
        onChange={(permissionIds) => setForm({ ...form, permissionIds })}
      />
      <div className="sticky bottom-4 flex justify-end rounded-md border border-border bg-surface p-3 shadow-md">
        <Button type="submit" loading={loading}>
          Save role
        </Button>
      </div>
    </form>
  );
}
