"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { FORM_PURPOSES } from "@/constants/forms";
import { formService } from "@/services/formService";
import { useToast } from "@/contexts/ToastProvider";
import { ApiClientError } from "@/lib/api/apiClient";

function NewFormInner() {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("Supplier Onboarding");
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState("supplier_onboarding");
  const [purpose, setPurpose] = useState("supplier_onboarding");
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await formService.create({ name, description, template, purpose });
      router.replace(`${ROUTES.forms}/${response.data.form.id}`);
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Could not create form");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-4">
      <h1 className="font-display text-2xl font-semibold">Create form</h1>
      <Card>
        <CardHeader>Form details</CardHeader>
        <CardBody className="space-y-4">
          <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} required />
          <Textarea label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
          <Select
            label="Template"
            value={template}
            onChange={(event) => {
              const next = event.target.value;
              setTemplate(next);
              if (next === "supplier_onboarding") setPurpose("supplier_onboarding");
              if (next === "frozen_food_permit") {
                setName("Frozen food processing permit");
                setPurpose("supplier_verification");
              }
            }}
          >
            <option value="blank">Blank form</option>
            <option value="supplier_onboarding">Supplier onboarding</option>
            <option value="frozen_food_permit">Frozen food processing permit</option>
          </Select>
          <Select label="Purpose" value={purpose} onChange={(event) => setPurpose(event.target.value)}>
            {FORM_PURPOSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <Button type="submit" loading={saving}>
            Create and open builder
          </Button>
        </CardBody>
      </Card>
    </form>
  );
}

export default function NewFormPage() {
  return (
    <PermissionGate permission={PERMISSIONS.FORMS_CREATE}>
      <NewFormInner />
    </PermissionGate>
  );
}
