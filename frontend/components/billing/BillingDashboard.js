"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { billingService } from "@/services/billingService";
import { useToast } from "@/contexts/ToastProvider";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ROUTES } from "@/constants/routes";
import { formatInr, JOB_STATUSES, INVOICE_STATUSES, labelFor, billingStatusVariant } from "@/constants/billing";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthProvider";
import { PERMISSIONS } from "@/constants/permissions";

function Stat({ label, value, hint }) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      </CardBody>
    </Card>
  );
}

export function BillingDashboard() {
  const toast = useToast();
  const { can } = useAuth();
  const [summary, setSummary] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    Promise.all([
      can(PERMISSIONS.BILLING_REPORTS_VIEW) ? billingService.summary() : Promise.resolve(null),
      can(PERMISSIONS.SERVICES_JOBS_VIEW) ? billingService.listJobs({ limit: 6, sort: "-updatedAt" }) : Promise.resolve(null),
      can(PERMISSIONS.INVOICES_VIEW) ? billingService.listInvoices({ limit: 6, sort: "-updatedAt" }) : Promise.resolve(null),
    ])
      .then(([report, jobList, invoiceList]) => {
        if (report) setSummary(report.data);
        if (jobList) setJobs(jobList.data.items || []);
        if (invoiceList) setInvoices(invoiceList.data.items || []);
      })
      .catch(() => toast.error("Unable to load billing overview"));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Services and billing</h1>
        <p className="text-sm text-muted">Sell certificate procurement, invoice suppliers, and record payments.</p>
      </div>
      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Outstanding" value={formatInr(summary.outstanding)} hint={`${summary.openInvoiceCount || 0} open invoices`} />
          <Stat label="Overdue" value={formatInr(summary.overdue)} hint={`${summary.overdueCount || 0} invoices`} />
          <Stat label="Collected this month" value={formatInr(summary.collectedMtd)} />
          <Stat label="Jobs in flight" value={summary.jobsInFlight || 0} />
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent jobs</h2>
            <Link href={ROUTES.billingJobs} className="text-sm text-primary">
              View all
            </Link>
          </CardHeader>
          <CardBody className="space-y-2">
            {jobs.length ? (
              jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`${ROUTES.billingJobs}/${job.id}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 hover:border-primary"
                >
                  <div>
                    <p className="font-medium">{job.jobNumber}</p>
                    <p className="text-xs text-muted">{job.lead?.name || "Supplier"} · due {formatDate(job.dueAt)}</p>
                  </div>
                  <Badge variant={billingStatusVariant(job.status)}>{labelFor(JOB_STATUSES, job.status)}</Badge>
                </Link>
              ))
            ) : (
              <EmptyState title="No jobs yet" description="Create a service job when a supplier is missing a certificate." />
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent invoices</h2>
            <Link href={ROUTES.billingInvoices} className="text-sm text-primary">
              View all
            </Link>
          </CardHeader>
          <CardBody className="space-y-2">
            {invoices.length ? (
              invoices.map((invoice) => (
                <Link
                  key={invoice.id}
                  href={`${ROUTES.billingInvoices}/${invoice.id}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 hover:border-primary"
                >
                  <div>
                    <p className="font-medium">{invoice.invoiceNumber || "Draft"}</p>
                    <p className="text-xs text-muted">
                      {invoice.billTo?.name || invoice.lead?.name} · {formatInr(invoice.grandTotal, invoice.currency)}
                    </p>
                  </div>
                  <Badge variant={billingStatusVariant(invoice.status)}>{labelFor(INVOICE_STATUSES, invoice.status)}</Badge>
                </Link>
              ))
            ) : (
              <EmptyState title="No invoices" description="Issue an invoice from a confirmed service job." />
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
