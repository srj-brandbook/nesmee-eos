"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { OwnerSelect } from "./OwnerSelect";
import { leadService } from "@/services/crmService";
import { LEAD_FORM_STAGES, LEAD_SOURCES } from "@/constants/crm";
import { useToast } from "@/contexts/ToastProvider";
import { ApiClientError } from "@/lib/api/apiClient";

const emptyForm = {
  name: "",
  legalName: "",
  email: "",
  phone: "",
  website: "",
  country: "",
  city: "",
  gstin: "",
  billingState: "",
  billingAddress: "",
  pincode: "",
  products: "",
  certifications: "",
  moq: "",
  exportMarkets: "",
  source: "other",
  stage: "new",
  score: 0,
  ownerId: "",
  notes: "",
  lostReason: "",
  disqualifiedReason: "",
  contactName: "",
  contactRole: "",
  contactEmail: "",
  contactPhone: "",
};

export function LeadForm({ leadId }) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState("");
  const [fields, setFields] = useState({});
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!leadId) return;
    leadService.get(leadId).then((response) => {
      const lead = response.data.lead;
      setForm({
        ...emptyForm,
        name: lead.name || "",
        legalName: lead.legalName || "",
        email: lead.email || "",
        phone: lead.phone || "",
        website: lead.website || "",
        country: lead.country || "",
        city: lead.city || "",
        gstin: lead.gstin || "",
        billingState: lead.billingState || "",
        billingAddress: lead.billingAddress || "",
        pincode: lead.pincode || "",
        products: lead.products || "",
        certifications: lead.certifications || "",
        moq: lead.moq || "",
        exportMarkets: lead.exportMarkets || "",
        source: lead.source || "other",
        stage: ["converted", "won"].includes(lead.stage) ? lead.stage : lead.stage || "new",
        score: lead.score || 0,
        ownerId: lead.ownerId || "",
        notes: lead.notes || "",
        lostReason: lead.lostReason || "",
        disqualifiedReason: lead.disqualifiedReason || "",
      });
    });
  }, [leadId]);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setFields({});
    const payload = {
      name: form.name,
      legalName: form.legalName,
      email: form.email,
      phone: form.phone,
      website: form.website,
      country: form.country,
      city: form.city,
      gstin: form.gstin,
      billingState: form.billingState,
      billingAddress: form.billingAddress,
      pincode: form.pincode,
      products: form.products,
      certifications: form.certifications,
      moq: form.moq,
      exportMarkets: form.exportMarkets,
      source: form.source,
      score: Number(form.score) || 0,
      ownerId: form.ownerId || null,
      notes: form.notes,
      lostReason: form.stage === "lost" ? form.lostReason : "",
      disqualifiedReason: form.stage === "disqualified" ? form.disqualifiedReason : "",
    };
    if (form.stage === "lost") payload.statusNote = form.lostReason;
    if (form.stage === "disqualified") payload.statusNote = form.disqualifiedReason;
    if (leadId && !["converted", "won"].includes(form.stage)) payload.stage = form.stage;
    if (!leadId && form.contactName.trim()) {
      payload.primaryContact = {
        name: form.contactName.trim(),
        role: form.contactRole,
        email: form.contactEmail,
        phone: form.contactPhone,
      };
    }
    try {
      if (leadId) {
        await leadService.update(leadId, payload);
        toast.success("Manufacturer updated");
        router.push(`/leads/${leadId}`);
      } else {
        const created = await leadService.create(payload);
        toast.success("Manufacturer lead created");
        router.push(`/leads/${created.data.lead.id}`);
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
        setFields(err.fields);
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
          <h2 className="font-semibold">Manufacturer</h2>
          <p className="mt-1 text-sm text-muted">Company profile used to evaluate export-supplier fit.</p>
        </CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Input
            label="Company name"
            value={form.name}
            error={fields.name}
            required
            onChange={(event) => setField("name", event.target.value)}
          />
          <Input
            label="Legal name"
            value={form.legalName}
            onChange={(event) => setField("legalName", event.target.value)}
          />
          <Input label="Country" value={form.country} onChange={(event) => setField("country", event.target.value)} />
          <Input label="City" value={form.city} onChange={(event) => setField("city", event.target.value)} />
          <Input label="GSTIN" value={form.gstin} onChange={(event) => setField("gstin", event.target.value)} />
          <Input label="Billing state" value={form.billingState} onChange={(event) => setField("billingState", event.target.value)} />
          <Input label="Pincode" value={form.pincode} onChange={(event) => setField("pincode", event.target.value)} />
          <div className="md:col-span-2">
            <Input label="Billing address" value={form.billingAddress} onChange={(event) => setField("billingAddress", event.target.value)} />
          </div>
          <Input
            label="Company email"
            type="email"
            value={form.email}
            error={fields.email}
            onChange={(event) => setField("email", event.target.value)}
          />
          <Input label="Phone" value={form.phone} onChange={(event) => setField("phone", event.target.value)} />
          <Input label="Website" value={form.website} onChange={(event) => setField("website", event.target.value)} />
          <Select label="Source" value={form.source} onChange={(event) => setField("source", event.target.value)}>
            {LEAD_SOURCES.map((source) => (
              <option key={source.value} value={source.value}>
                {source.label}
              </option>
            ))}
          </Select>
          <div className="md:col-span-2">
            <Textarea
              label="Products / capabilities"
              value={form.products}
              onChange={(event) => setField("products", event.target.value)}
            />
          </div>
          <Input
            label="Certifications"
            hint="ISO, BSCI, GOTS, and similar"
            value={form.certifications}
            onChange={(event) => setField("certifications", event.target.value)}
          />
          <Input label="MOQ" value={form.moq} onChange={(event) => setField("moq", event.target.value)} />
          <Input
            label="Export markets"
            value={form.exportMarkets}
            onChange={(event) => setField("exportMarkets", event.target.value)}
          />
          <Input
            label="Fit score"
            type="number"
            min="0"
            max="100"
            value={form.score}
            onChange={(event) => setField("score", event.target.value)}
          />
          {leadId && !["converted", "won"].includes(form.stage) ? (
            <Select label="Status" value={form.stage} onChange={(event) => setField("stage", event.target.value)}>
              {LEAD_FORM_STAGES.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </Select>
          ) : null}
          <OwnerSelect value={form.ownerId} onChange={(event) => setField("ownerId", event.target.value)} />
          {form.stage === "lost" ? (
            <Input
              label="Lost reason"
              value={form.lostReason}
              onChange={(event) => setField("lostReason", event.target.value)}
            />
          ) : null}
          {form.stage === "disqualified" ? (
            <Input
              label="Disqualified reason"
              value={form.disqualifiedReason}
              onChange={(event) => setField("disqualifiedReason", event.target.value)}
            />
          ) : null}
          <div className="md:col-span-2">
            <Textarea label="Notes" value={form.notes} onChange={(event) => setField("notes", event.target.value)} />
          </div>
        </CardBody>
      </Card>
      {!leadId ? (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Primary contact</h2>
            <p className="mt-1 text-sm text-muted">Optional. Add more people from the lead after it is created.</p>
          </CardHeader>
          <CardBody className="grid gap-4 md:grid-cols-2">
            <Input
              label="Contact name"
              value={form.contactName}
              onChange={(event) => setField("contactName", event.target.value)}
            />
            <Input
              label="Role"
              value={form.contactRole}
              onChange={(event) => setField("contactRole", event.target.value)}
            />
            <Input
              label="Email"
              type="email"
              value={form.contactEmail}
              onChange={(event) => setField("contactEmail", event.target.value)}
            />
            <Input
              label="Phone"
              value={form.contactPhone}
              onChange={(event) => setField("contactPhone", event.target.value)}
            />
          </CardBody>
        </Card>
      ) : null}
      <Button type="submit" loading={loading}>
        {leadId ? "Save manufacturer" : "Create lead"}
      </Button>
    </form>
  );
}
