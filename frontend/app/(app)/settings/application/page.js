"use client";

import { useEffect, useState } from "react";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { settingsService } from "@/services/settingsService";
import { useToast } from "@/contexts/ToastProvider";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { PERMISSIONS } from "@/constants/permissions";
import { useAuth } from "@/contexts/AuthProvider";

function ApplicationSettings() {
  const toast = useToast();
  const { can } = useAuth();
  const [form, setForm] = useState({
    name: "",
    supportEmail: "",
    signupEnabled: true,
    maintenanceMode: false,
  });

  useEffect(() => {
    settingsService.get().then((response) => setForm(response.data.settings));
  }, []);

  const readOnly = !can(PERMISSIONS.SETTINGS_UPDATE);

  return (
    <form
      className="max-w-xl space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        await settingsService.update(form);
        toast.success("Settings saved");
      }}
    >
      <h1 className="font-display text-2xl font-semibold">Application settings</h1>
      <Input label="Application name" value={form.name} disabled={readOnly} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      <Input label="Support email" type="email" value={form.supportEmail} disabled={readOnly} onChange={(event) => setForm({ ...form, supportEmail: event.target.value })} />
      <Checkbox label="Signup enabled" checked={form.signupEnabled} disabled={readOnly} onChange={(event) => setForm({ ...form, signupEnabled: event.target.checked })} />
      <Checkbox label="Maintenance mode" checked={form.maintenanceMode} disabled={readOnly} onChange={(event) => setForm({ ...form, maintenanceMode: event.target.checked })} />
      {!readOnly ? <Button type="submit">Save settings</Button> : null}
    </form>
  );
}

export default function ApplicationSettingsPage() {
  return (
    <PermissionGate permission={PERMISSIONS.SETTINGS_VIEW}>
      <ApplicationSettings />
    </PermissionGate>
  );
}
