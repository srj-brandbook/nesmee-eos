"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Checkbox } from "@/components/ui/Checkbox";
import { FileUpload } from "@/components/ui/FileUpload";
import { userService } from "@/services/userService";
import { roleService } from "@/services/roleService";
import { useToast } from "@/contexts/ToastProvider";
import { ApiClientError } from "@/lib/api/apiClient";

export function UserForm({ userId }) {
  const router = useRouter();
  const toast = useToast();
  const [roles, setRoles] = useState([]);
  const [fields, setFields] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    status: "active",
    roleIds: [],
    avatarUrl: "",
    avatarPublicId: "",
  });

  useEffect(() => {
    roleService.list({ limit: 100 }).then((response) => setRoles(response.data.items)).catch(() => setRoles([]));
  }, []);

  useEffect(() => {
    if (!userId) return;
    userService.get(userId).then((response) => {
      const user = response.data.user;
      setForm({
        name: user.name,
        email: user.email,
        password: "",
        status: user.status,
        roleIds: user.roleIds,
        avatarUrl: user.avatarUrl || "",
        avatarPublicId: user.avatarPublicId || "",
      });
    });
  }, [userId]);

  function toggleRole(id) {
    setForm((current) => ({
      ...current,
      roleIds: current.roleIds.includes(id)
        ? current.roleIds.filter((roleId) => roleId !== id)
        : [...current.roleIds, id],
    }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setFields({});
    try {
      if (userId) {
        await userService.update(userId, {
          name: form.name,
          status: form.status,
          roleIds: form.roleIds,
          avatarUrl: form.avatarUrl,
          avatarPublicId: form.avatarPublicId,
        });
        toast.success("User updated");
        router.push(`/users/${userId}`);
      } else {
        await userService.create(form);
        toast.success("User created");
        router.push("/users");
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
        setFields(err.fields);
      } else {
        setError("Save failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4">
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <Input label="Name" value={form.name} error={fields.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
      <Input label="Email" type="email" value={form.email} error={fields.email} disabled={Boolean(userId)} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
      {!userId ? (
        <Input label="Temporary password" type="password" value={form.password} error={fields.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
      ) : null}
      <FileUpload
        label="Avatar"
        folder="avatars"
        resourceType="image"
        accept="image/*"
        maxSizeMb={2}
        destroyOnChange={false}
        hint="PNG or JPG, up to 2 MB"
        value={form.avatarUrl || form.avatarPublicId ? { url: form.avatarUrl, publicId: form.avatarPublicId, name: "Avatar", type: "image" } : null}
        onChange={(file) =>
          setForm((current) => ({
            ...current,
            avatarUrl: file?.url || "",
            avatarPublicId: file?.publicId || "",
          }))
        }
      />
      <Select label="Status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
        <option value="active">Active</option>
        <option value="pending_verification">Pending verification</option>
        <option value="disabled">Disabled</option>
      </Select>
      <div>
        <p className="mb-2 text-sm font-medium">Roles</p>
        <div className="space-y-2">
          {roles.map((role) => (
            <Checkbox key={role.id} label={role.name} checked={form.roleIds.includes(role.id)} onChange={() => toggleRole(role.id)} />
          ))}
        </div>
      </div>
      <Button type="submit" loading={loading}>
        {userId ? "Save user" : "Create user"}
      </Button>
    </form>
  );
}
