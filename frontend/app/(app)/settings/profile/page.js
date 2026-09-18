"use client";

import { useEffect, useState } from "react";
import { profileService } from "@/services/profileService";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { FileUpload } from "@/components/ui/FileUpload";

export default function ProfilePage() {
  const { refresh } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: "", avatarUrl: "", avatarPublicId: "", notifyInApp: true });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    profileService.get().then((response) => {
      const user = response.data.user;
      setForm({
        name: user.name,
        avatarUrl: user.avatarUrl || "",
        avatarPublicId: user.avatarPublicId || "",
        notifyInApp: user.notifyInApp !== false,
      });
    });
  }, []);

  return (
    <form
      className="max-w-xl space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setLoading(true);
        try {
          await profileService.update(form);
          await refresh();
          toast.success("Profile updated");
        } finally {
          setLoading(false);
        }
      }}
    >
      <h1 className="font-display text-2xl font-semibold">Profile</h1>
      <Input label="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
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
      <Checkbox label="In-app notifications" checked={form.notifyInApp} onChange={(event) => setForm({ ...form, notifyInApp: event.target.checked })} />
      <Button type="submit" loading={loading}>
        Save profile
      </Button>
    </form>
  );
}
