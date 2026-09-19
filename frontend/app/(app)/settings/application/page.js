"use client";

import { useEffect, useState } from "react";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { settingsService } from "@/services/settingsService";
import { useToast } from "@/contexts/ToastProvider";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { FileUpload } from "@/components/ui/FileUpload";
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
    legalName: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    country: "",
    gstin: "",
    logoUrl: "",
    logoPublicId: "",
    signatoryName: "",
    signatoryTitle: "",
  });

  useEffect(() => {
    settingsService.get().then((response) => setForm((current) => ({ ...current, ...response.data.settings })));
  }, []);

  const readOnly = !can(PERMISSIONS.SETTINGS_UPDATE);
  const logo = form.logoUrl ? { url: form.logoUrl, publicId: form.logoPublicId, name: "Logo" } : null;

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

      <h2 className="pt-4 font-display text-lg font-semibold">Letterhead</h2>
      <p className="text-sm text-muted">Used on issued proposals, NOCs, and other official documents.</p>
      <Input label="Legal name" value={form.legalName || ""} disabled={readOnly} onChange={(event) => setForm({ ...form, legalName: event.target.value })} />
      <Input label="Address" value={form.address || ""} disabled={readOnly} onChange={(event) => setForm({ ...form, address: event.target.value })} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="City" value={form.city || ""} disabled={readOnly} onChange={(event) => setForm({ ...form, city: event.target.value })} />
        <Input label="State" value={form.state || ""} disabled={readOnly} onChange={(event) => setForm({ ...form, state: event.target.value })} />
        <Input label="Pincode" value={form.pincode || ""} disabled={readOnly} onChange={(event) => setForm({ ...form, pincode: event.target.value })} />
        <Input label="Country" value={form.country || ""} disabled={readOnly} onChange={(event) => setForm({ ...form, country: event.target.value })} />
      </div>
      <Input label="GSTIN" value={form.gstin || ""} disabled={readOnly} onChange={(event) => setForm({ ...form, gstin: event.target.value })} />
      <FileUpload
        label="Logo"
        value={logo}
        folder="documents"
        accept="image/*"
        disabled={readOnly}
        maxSizeMb={5}
        onChange={(file) => setForm({ ...form, logoUrl: file?.url || "", logoPublicId: file?.publicId || "" })}
      />
      <Input label="Default signatory" value={form.signatoryName || ""} disabled={readOnly} onChange={(event) => setForm({ ...form, signatoryName: event.target.value })} />
      <Input label="Signatory title" value={form.signatoryTitle || ""} disabled={readOnly} onChange={(event) => setForm({ ...form, signatoryTitle: event.target.value })} />
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
