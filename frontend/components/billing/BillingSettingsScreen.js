"use client";

import { useEffect, useState } from "react";
import { billingService } from "@/services/billingService";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { INDIAN_STATES } from "@/constants/billing";
import { PERMISSIONS } from "@/constants/permissions";
import { ApiClientError } from "@/lib/api/apiClient";

const emptySettings = {
  legalName: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  gstin: "",
  pan: "",
  email: "",
  phone: "",
  logoUrl: "",
  currency: "INR",
  invoicePrefix: "INV",
  creditNotePrefix: "CN",
  jobPrefix: "JOB",
  paymentPrefix: "PAY",
  defaultDueDays: 15,
  defaultTaxRateId: "",
  paymentTerms: "",
  bankName: "",
  bankAccount: "",
  bankIfsc: "",
  upiId: "",
  paymentFooter: "",
};

export function BillingSettingsScreen() {
  const toast = useToast();
  const { can } = useAuth();
  const readOnly = !can(PERMISSIONS.BILLING_SETTINGS_UPDATE);
  const [form, setForm] = useState(emptySettings);
  const [taxRates, setTaxRates] = useState([]);
  const [taxForm, setTaxForm] = useState({ name: "", code: "", rate: 18, isDefault: false });
  const [pendingRate, setPendingRate] = useState(null);

  async function load() {
    const [settingsRes, ratesRes] = await Promise.all([
      billingService.settings(),
      billingService.listTaxRates({ limit: 100 }),
    ]);
    const settings = settingsRes.data.settings;
    setForm({
      ...emptySettings,
      ...settings,
      defaultTaxRateId: settings.defaultTaxRateId || "",
    });
    setTaxRates(ratesRes.data.items || []);
  }

  useEffect(() => {
    load().catch(() => toast.error("Unable to load billing settings"));
  }, []);

  async function save(event) {
    event.preventDefault();
    await billingService.updateSettings({ ...form, defaultTaxRateId: form.defaultTaxRateId || null });
    toast.success("Billing settings saved");
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Billing settings</h1>
        <p className="text-sm text-muted">Company identity, GST, invoice numbering, and bank details printed on invoices.</p>
      </div>
      <form onSubmit={save} className="space-y-4">
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Company</h2>
          </CardHeader>
          <CardBody className="grid gap-4 md:grid-cols-2">
            <Input label="Legal name" value={form.legalName} disabled={readOnly} onChange={(event) => setForm({ ...form, legalName: event.target.value })} />
            <Input label="GSTIN" value={form.gstin} disabled={readOnly} onChange={(event) => setForm({ ...form, gstin: event.target.value })} />
            <Input label="PAN" value={form.pan} disabled={readOnly} onChange={(event) => setForm({ ...form, pan: event.target.value })} />
            <Select label="State" value={form.state} disabled={readOnly} onChange={(event) => setForm({ ...form, state: event.target.value })}>
              <option value="">Select state</option>
              {INDIAN_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </Select>
            <Input label="City" value={form.city} disabled={readOnly} onChange={(event) => setForm({ ...form, city: event.target.value })} />
            <Input label="Pincode" value={form.pincode} disabled={readOnly} onChange={(event) => setForm({ ...form, pincode: event.target.value })} />
            <div className="md:col-span-2">
              <Input label="Address" value={form.address} disabled={readOnly} onChange={(event) => setForm({ ...form, address: event.target.value })} />
            </div>
            <Input label="Email" type="email" value={form.email} disabled={readOnly} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            <Input label="Phone" value={form.phone} disabled={readOnly} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            <Input label="Logo URL" value={form.logoUrl} disabled={readOnly} onChange={(event) => setForm({ ...form, logoUrl: event.target.value })} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Numbering and terms</h2>
          </CardHeader>
          <CardBody className="grid gap-4 md:grid-cols-2">
            <Input label="Invoice prefix" value={form.invoicePrefix} disabled={readOnly} onChange={(event) => setForm({ ...form, invoicePrefix: event.target.value })} />
            <Input label="Credit note prefix" value={form.creditNotePrefix} disabled={readOnly} onChange={(event) => setForm({ ...form, creditNotePrefix: event.target.value })} />
            <Input label="Job prefix" value={form.jobPrefix} disabled={readOnly} onChange={(event) => setForm({ ...form, jobPrefix: event.target.value })} />
            <Input label="Payment prefix" value={form.paymentPrefix} disabled={readOnly} onChange={(event) => setForm({ ...form, paymentPrefix: event.target.value })} />
            <Input label="Default due days" type="number" min="0" value={form.defaultDueDays} disabled={readOnly} onChange={(event) => setForm({ ...form, defaultDueDays: Number(event.target.value) })} />
            <Select label="Default tax rate" value={form.defaultTaxRateId} disabled={readOnly} onChange={(event) => setForm({ ...form, defaultTaxRateId: event.target.value })}>
              <option value="">None</option>
              {taxRates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.rate}%)
                </option>
              ))}
            </Select>
            <div className="md:col-span-2">
              <Textarea label="Payment terms" value={form.paymentTerms} disabled={readOnly} onChange={(event) => setForm({ ...form, paymentTerms: event.target.value })} />
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Bank and UPI</h2>
          </CardHeader>
          <CardBody className="grid gap-4 md:grid-cols-2">
            <Input label="Bank name" value={form.bankName} disabled={readOnly} onChange={(event) => setForm({ ...form, bankName: event.target.value })} />
            <Input label="Account number" value={form.bankAccount} disabled={readOnly} onChange={(event) => setForm({ ...form, bankAccount: event.target.value })} />
            <Input label="IFSC" value={form.bankIfsc} disabled={readOnly} onChange={(event) => setForm({ ...form, bankIfsc: event.target.value })} />
            <Input label="UPI ID" value={form.upiId} disabled={readOnly} onChange={(event) => setForm({ ...form, upiId: event.target.value })} />
            <div className="md:col-span-2">
              <Textarea label="Invoice footer" value={form.paymentFooter} disabled={readOnly} onChange={(event) => setForm({ ...form, paymentFooter: event.target.value })} />
            </div>
          </CardBody>
        </Card>
        {!readOnly ? <Button type="submit">Save settings</Button> : null}
      </form>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Tax rates</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <Table
            columns={[
              { key: "name", label: "Name" },
              { key: "code", label: "Code" },
              { key: "rate", label: "Rate", render: (row) => `${row.rate}%` },
              { key: "isDefault", label: "Default", render: (row) => (row.isDefault ? "Yes" : "—") },
              {
                key: "actions",
                label: "",
                render: (row) =>
                  !readOnly ? (
                    <button type="button" className="text-sm text-danger" onClick={() => setPendingRate(row)}>
                      Delete
                    </button>
                  ) : null,
              },
            ]}
            rows={taxRates}
          />
          {!readOnly ? (
            <div className="grid gap-3 md:grid-cols-4">
              <Input label="Name" value={taxForm.name} onChange={(event) => setTaxForm({ ...taxForm, name: event.target.value })} />
              <Input label="Code" value={taxForm.code} onChange={(event) => setTaxForm({ ...taxForm, code: event.target.value })} />
              <Input label="Rate %" type="number" value={taxForm.rate} onChange={(event) => setTaxForm({ ...taxForm, rate: event.target.value })} />
              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={async () => {
                    try {
                      await billingService.createTaxRate({ ...taxForm, rate: Number(taxForm.rate) || 0 });
                      setTaxForm({ name: "", code: "", rate: 18, isDefault: false });
                      toast.success("Tax rate added");
                      load();
                    } catch (err) {
                      toast.error(err instanceof ApiClientError ? err.message : "Could not add rate");
                    }
                  }}
                >
                  Add rate
                </Button>
              </div>
            </div>
          ) : null}
        </CardBody>
      </Card>
      <ConfirmationDialog
        open={Boolean(pendingRate)}
        title="Delete tax rate"
        description={`Remove ${pendingRate?.name}?`}
        onClose={() => setPendingRate(null)}
        onConfirm={async () => {
          await billingService.removeTaxRate(pendingRate.id);
          setPendingRate(null);
          toast.success("Tax rate deleted");
          load();
        }}
      />
    </div>
  );
}
