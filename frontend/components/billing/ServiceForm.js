"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { billingService } from "@/services/billingService";
import { formService } from "@/services/formService";
import { useToast } from "@/contexts/ToastProvider";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Alert } from "@/components/ui/Alert";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SERVICE_CATEGORIES } from "@/constants/billing";
import { ROUTES } from "@/constants/routes";
import { ApiClientError } from "@/lib/api/apiClient";
import { useAuth } from "@/contexts/AuthProvider";
import { PERMISSIONS } from "@/constants/permissions";

const empty = {
  code: "",
  name: "",
  category: "certificate",
  description: "",
  isActive: true,
  unitPrice: 0,
  costPrice: 0,
  slaDays: 14,
  taxRateId: "",
  formDefinitionId: "",
  documentKey: "",
  hsnSac: "9983",
};

export function ServiceForm({ serviceId }) {
  const router = useRouter();
  const toast = useToast();
  const { can } = useAuth();
  const readOnly = serviceId ? !can(PERMISSIONS.SERVICES_UPDATE) : !can(PERMISSIONS.SERVICES_CREATE);
  const [form, setForm] = useState(empty);
  const [taxRates, setTaxRates] = useState([]);
  const [forms, setForms] = useState([]);
  const [error, setError] = useState("");
  const [fields, setFields] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    billingService.listTaxRates({ limit: 100, active: "true" }).then((response) => setTaxRates(response.data.items || [])).catch(() => {});
    formService.list({ purpose: "supplier_verification", limit: 100 }).then((response) => setForms(response.data.items || [])).catch(() => {});
    if (!serviceId) return;
    billingService.getService(serviceId).then((response) => {
      const item = response.data.service;
      setForm({
        code: item.code || "",
        name: item.name || "",
        category: item.category || "certificate",
        description: item.description || "",
        isActive: item.isActive !== false,
        unitPrice: item.unitPrice || 0,
        costPrice: item.costPrice || 0,
        slaDays: item.slaDays || 0,
        taxRateId: item.taxRateId || "",
        formDefinitionId: item.formDefinitionId || "",
        documentKey: item.documentKey || "",
        hsnSac: item.hsnSac || "",
      });
    });
  }, [serviceId]);

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setFields({});
    const payload = {
      ...form,
      unitPrice: Number(form.unitPrice) || 0,
      costPrice: Number(form.costPrice) || 0,
      slaDays: Number(form.slaDays) || 0,
      taxRateId: form.taxRateId || null,
      formDefinitionId: form.formDefinitionId || null,
    };
    try {
      if (serviceId) {
        await billingService.updateService(serviceId, payload);
        toast.success("Service updated");
      } else {
        await billingService.createService(payload);
        toast.success("Service created");
      }
      router.push(ROUTES.billingServices);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
        setFields(err.fields || {});
      } else setError("Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <Card>
        <CardHeader>
          <h1 className="font-display text-2xl font-semibold">{serviceId ? "Edit service" : "New service"}</h1>
          <p className="mt-1 text-sm text-muted">Catalog item sold when a supplier needs a certificate obtained on their behalf.</p>
        </CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Input label="Code" value={form.code} error={fields.code} disabled={readOnly} requiredMark onChange={(event) => setForm({ ...form, code: event.target.value })} />
          <Input label="Name" value={form.name} error={fields.name} disabled={readOnly} requiredMark onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <Select label="Category" value={form.category} disabled={readOnly} onChange={(event) => setForm({ ...form, category: event.target.value })}>
            {SERVICE_CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <Select label="Tax rate" value={form.taxRateId} disabled={readOnly} onChange={(event) => setForm({ ...form, taxRateId: event.target.value })}>
            <option value="">None</option>
            {taxRates.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.rate}%)
              </option>
            ))}
          </Select>
          <Input label="Sell price (INR)" type="number" min="0" step="0.01" value={form.unitPrice} disabled={readOnly} onChange={(event) => setForm({ ...form, unitPrice: event.target.value })} />
          <Input label="Authority / cost price" type="number" min="0" step="0.01" value={form.costPrice} disabled={readOnly} onChange={(event) => setForm({ ...form, costPrice: event.target.value })} />
          <Input label="SLA (days)" type="number" min="0" value={form.slaDays} disabled={readOnly} onChange={(event) => setForm({ ...form, slaDays: event.target.value })} />
          <Input label="HSN / SAC" value={form.hsnSac} disabled={readOnly} onChange={(event) => setForm({ ...form, hsnSac: event.target.value })} />
          <Select label="Verification form" value={form.formDefinitionId} disabled={readOnly} onChange={(event) => setForm({ ...form, formDefinitionId: event.target.value })}>
            <option value="">Not linked</option>
            {forms.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
          <Input
            label="Document key"
            hint="Must match the verification document key, e.g. fssai_license"
            value={form.documentKey}
            disabled={readOnly}
            onChange={(event) => setForm({ ...form, documentKey: event.target.value })}
          />
          <div className="md:col-span-2">
            <Textarea label="Description" value={form.description} disabled={readOnly} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </div>
          <Checkbox label="Active" checked={form.isActive} disabled={readOnly} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
        </CardBody>
      </Card>
      {!readOnly ? <Button type="submit" loading={loading}>{serviceId ? "Save service" : "Create service"}</Button> : null}
    </form>
  );
}
