"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { billingService } from "@/services/billingService";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { CreateJobFromGapModal } from "./CreateJobFromGapModal";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { JOB_STATUSES, INVOICE_STATUSES, formatInr, labelFor, billingStatusVariant } from "@/constants/billing";
import { formatDate } from "@/lib/utils";

export function SupplierBillingPanel({ leadId }) {
  const toast = useToast();
  const { can } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [gap, setGap] = useState(null);

  async function load() {
    const [jobRes, invoiceRes, gapRes] = await Promise.all([
      billingService.listJobs({ leadId, limit: 50, sort: "-createdAt" }),
      can(PERMISSIONS.INVOICES_VIEW) ? billingService.listInvoices({ leadId, limit: 50, sort: "-createdAt" }) : Promise.resolve({ data: { items: [] } }),
      can(PERMISSIONS.SERVICES_JOBS_VIEW) ? billingService.jobGaps(leadId) : Promise.resolve({ data: { items: [] } }),
    ]);
    setJobs(jobRes.data.items || []);
    setInvoices(invoiceRes.data.items || []);
    setGaps(gapRes.data.items || []);
  }

  useEffect(() => {
    if (!leadId || !can(PERMISSIONS.SERVICES_JOBS_VIEW)) return;
    load().catch(() => toast.error("Unable to load billing"));
  }, [leadId]);

  if (!can(PERMISSIONS.SERVICES_JOBS_VIEW)) {
    return <p className="text-sm text-muted">You do not have access to supplier services.</p>;
  }

  return (
    <div className="space-y-4">
      {gaps.length ? (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Missing certificates</h2>
            <p className="text-xs text-muted">Sell procurement as a billed service when the supplier does not have the document.</p>
          </CardHeader>
          <CardBody className="space-y-2">
            {gaps.map((item) => (
              <div key={item.documentId} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-xs text-muted">{item.documentKey} · {item.status.replace(/_/g, " ")}</p>
                </div>
                {can(PERMISSIONS.SERVICES_JOBS_CREATE) ? (
                  <Button size="sm" onClick={() => setGap(item)}>
                    Sell as service
                  </Button>
                ) : null}
              </div>
            ))}
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Service jobs</h2>
          {can(PERMISSIONS.SERVICES_JOBS_CREATE) ? (
            <Link href={`${ROUTES.billingJobs}/new?leadId=${leadId}`}>
              <Button size="sm" variant="outline">New job</Button>
            </Link>
          ) : null}
        </CardHeader>
        <CardBody className="space-y-2">
          {jobs.length ? (
            jobs.map((job) => (
              <Link key={job.id} href={`${ROUTES.billingJobs}/${job.id}`} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 hover:border-primary">
                <div>
                  <p className="font-medium">{job.jobNumber}</p>
                  <p className="text-xs text-muted">{formatInr(job.grandTotal, job.currency)} · due {formatDate(job.dueAt)}</p>
                </div>
                <Badge variant={billingStatusVariant(job.status)}>{labelFor(JOB_STATUSES, job.status)}</Badge>
              </Link>
            ))
          ) : (
            <EmptyState title="No service jobs" description="Create a job when you will obtain a certificate on the supplier’s behalf." />
          )}
        </CardBody>
      </Card>

      {can(PERMISSIONS.INVOICES_VIEW) ? (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Invoices</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            {invoices.length ? (
              invoices.map((invoice) => (
                <Link key={invoice.id} href={`${ROUTES.billingInvoices}/${invoice.id}`} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 hover:border-primary">
                  <div>
                    <p className="font-medium">{invoice.invoiceNumber || "Draft"}</p>
                    <p className="text-xs text-muted">{formatInr(invoice.grandTotal, invoice.currency)} due {formatInr(invoice.amountDue, invoice.currency)}</p>
                  </div>
                  <Badge variant={billingStatusVariant(invoice.status)}>{labelFor(INVOICE_STATUSES, invoice.status)}</Badge>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted">No invoices for this supplier.</p>
            )}
          </CardBody>
        </Card>
      ) : null}

      <CreateJobFromGapModal open={Boolean(gap)} leadId={leadId} gap={gap} onClose={() => setGap(null)} onCreated={load} />
    </div>
  );
}
