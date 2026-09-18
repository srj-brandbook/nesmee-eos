"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { billingService } from "@/services/billingService";
import { leadService } from "@/services/crmService";
import { useToast } from "@/contexts/ToastProvider";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { formatInr } from "@/constants/billing";
import { ROUTES } from "@/constants/routes";
import { ApiClientError } from "@/lib/api/apiClient";

function emptyLine(offering) {
  return {
    offeringId: offering?.id || "",
    documentKey: offering?.documentKey || "",
    description: offering?.name || "",
    quantity: 1,
    unitPrice: offering?.unitPrice || 0,
    discount: 0,
    taxRateId: offering?.taxRateId || "",
    hsnSac: offering?.hsnSac || "",
  };
}

export function JobForm({ initialLeadId = "", initialOfferingId = "", initialSource = "manual", initialCaseId = "", initialDocumentKey = "" }) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [leadSearch, setLeadSearch] = useState("");
  const [form, setForm] = useState({
    leadId: initialLeadId,
    assigneeId: "",
    notes: "",
    lines: [emptyLine()],
  });

  useEffect(() => {
    billingService.listServices({ active: "true", limit: 100 }).then((response) => {
      const items = response.data.items || [];
      setOfferings(items);
      const match = items.find((item) => item.id === initialOfferingId || (initialDocumentKey && item.documentKey === initialDocumentKey));
      if (match) setForm((current) => ({ ...current, lines: [emptyLine(match)] }));
    }).catch(() => {});
    leadService.assignees().then((response) => setAssignees(response.data.items || [])).catch(() => {});
  }, [initialOfferingId, initialDocumentKey]);

  useEffect(() => {
    const timer = setTimeout(() => {
      leadService.list({ search: leadSearch, limit: 20, sort: "name" }).then((response) => setLeads(response.data.items || [])).catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [leadSearch]);

  function setLine(index, patch) {
    setForm((current) => {
      const lines = current.lines.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line));
      return { ...current, lines };
    });
  }

  function applyOffering(index, offeringId) {
    const offering = offerings.find((item) => item.id === offeringId);
    setLine(index, emptyLine(offering));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const created = await billingService.createJob({
        leadId: form.leadId,
        assigneeId: form.assigneeId || null,
        notes: form.notes,
        source: initialSource,
        verificationCaseId: initialCaseId || null,
        lines: form.lines.map((line) => ({
          ...line,
          offeringId: line.offeringId || null,
          taxRateId: line.taxRateId || null,
          quantity: Number(line.quantity) || 1,
          unitPrice: Number(line.unitPrice) || 0,
          discount: Number(line.discount) || 0,
        })),
      });
      toast.success("Service job created");
      router.push(`${ROUTES.billingJobs}/${created.data.job.id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not create job");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <Card>
        <CardHeader>
          <h1 className="font-display text-2xl font-semibold">New service job</h1>
          <p className="mt-1 text-sm text-muted">Create a work order to obtain a certificate or other billed service.</p>
        </CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Select label="Supplier" value={form.leadId} requiredMark onChange={(event) => setForm({ ...form, leadId: event.target.value })}>
            <option value="">Select supplier</option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.name}
              </option>
            ))}
          </Select>
          <Input label="Find supplier" value={leadSearch} onChange={(event) => setLeadSearch(event.target.value)} />
          <Select label="Assignee" value={form.assigneeId} onChange={(event) => setForm({ ...form, assigneeId: event.target.value })}>
            <option value="">Me / unassigned</option>
            {assignees.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Select>
          <div className="md:col-span-2">
            <Textarea label="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="font-semibold">Lines</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => setForm((current) => ({ ...current, lines: [...current.lines, emptyLine()] }))}>
            Add line
          </Button>
        </CardHeader>
        <CardBody className="space-y-4">
          {form.lines.map((line, index) => (
            <div key={`${index}-${line.offeringId}`} className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-6">
              <div className="md:col-span-2">
                <Select label="Catalog item" value={line.offeringId} onChange={(event) => applyOffering(index, event.target.value)}>
                  <option value="">Custom line</option>
                  {offerings.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} · {formatInr(item.unitPrice)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="md:col-span-2">
                <Input label="Description" value={line.description} onChange={(event) => setLine(index, { description: event.target.value })} />
              </div>
              <Input label="Qty" type="number" min="0" value={line.quantity} onChange={(event) => setLine(index, { quantity: event.target.value })} />
              <Input label="Unit price" type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => setLine(index, { unitPrice: event.target.value })} />
              {form.lines.length > 1 ? (
                <div className="md:col-span-6">
                  <button type="button" className="text-sm text-danger" onClick={() => setForm((current) => ({ ...current, lines: current.lines.filter((_, lineIndex) => lineIndex !== index) }))}>
                    Remove line
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </CardBody>
      </Card>
      <Button type="submit" loading={loading}>
        Create job
      </Button>
    </form>
  );
}
