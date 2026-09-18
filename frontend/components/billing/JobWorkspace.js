"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { billingService } from "@/services/billingService";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { FileUpload } from "@/components/ui/FileUpload";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { JOB_STATUSES, formatInr, labelFor, billingStatusVariant } from "@/constants/billing";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES, verificationCasePath } from "@/constants/routes";
import { formatDate, formatDateTime } from "@/lib/utils";
import { ApiClientError } from "@/lib/api/apiClient";

export function JobWorkspace({ jobId }) {
  const toast = useToast();
  const { can } = useAuth();
  const [job, setJob] = useState(null);
  const [note, setNote] = useState("");
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState("");
  const [closeOpen, setCloseOpen] = useState(false);

  async function load() {
    const response = await billingService.getJob(jobId);
    setJob(response.data.job);
  }

  useEffect(() => {
    load().catch(() => toast.error("Unable to load job"));
  }, [jobId]);

  async function run(action, fn, extra = {}) {
    setBusy(action);
    try {
      const response = await fn(jobId, { note, ...extra });
      setJob(response.data.job);
      setNote("");
      toast.success("Job updated");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Action failed");
    } finally {
      setBusy("");
    }
  }

  if (!job) return <p className="text-sm text-muted">Loading job…</p>;

  const canUpdate = can(PERMISSIONS.SERVICES_JOBS_UPDATE);
  const canFulfill = can(PERMISSIONS.SERVICES_JOBS_FULFILL);
  const canInvoice = can(PERMISSIONS.INVOICES_CREATE) && ["confirmed", "in_progress", "awaiting_authority", "delivered", "closed"].includes(job.status);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Service job</p>
          <h1 className="font-display text-2xl font-semibold">{job.jobNumber}</h1>
          <p className="text-sm text-muted">{job.lead?.name || "Supplier"} · due {formatDate(job.dueAt)}</p>
        </div>
        <Badge variant={billingStatusVariant(job.status)}>{labelFor(JOB_STATUSES, job.status)}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Lines</h2>
            </CardHeader>
            <CardBody className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-muted">
                  <tr>
                    <th className="pb-2">Description</th>
                    <th className="pb-2">Qty</th>
                    <th className="pb-2">Price</th>
                    <th className="pb-2">Tax</th>
                    <th className="pb-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(job.lines || []).map((line, index) => (
                    <tr key={line.id || index} className="border-t border-border">
                      <td className="py-2">
                        <p>{line.description}</p>
                        {line.documentKey ? <p className="text-xs text-muted">{line.documentKey}</p> : null}
                      </td>
                      <td className="py-2">{line.quantity}</td>
                      <td className="py-2">{formatInr(line.unitPrice, job.currency)}</td>
                      <td className="py-2">{formatInr(line.taxAmount, job.currency)}</td>
                      <td className="py-2">{formatInr(line.lineTotal, job.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-4 text-right text-sm font-medium">Total {formatInr(job.grandTotal, job.currency)}</p>
            </CardBody>
          </Card>

          {job.status === "awaiting_authority" || job.status === "in_progress" ? (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold">Delivery files</h2>
              </CardHeader>
              <CardBody>
                <FileUpload
                  label="Certificate files"
                  value={files}
                  onChange={setFiles}
                  maxFiles={5}
                  folder="billing"
                  accept="application/pdf,image/*"
                />
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Timeline</h2>
            </CardHeader>
            <CardBody>
              <ul className="space-y-2 text-sm">
                {(job.history || []).slice().reverse().map((event, index) => (
                  <li key={`${event.action}-${event.createdAt}-${index}`}>
                    <span className="font-medium">{event.action.replace(/_/g, " ")}</span>
                    <span className="text-muted"> · {formatDateTime(event.createdAt)}</span>
                    {event.note ? <p className="text-muted">{event.note}</p> : null}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Actions</h2>
            </CardHeader>
            <CardBody className="space-y-3">
              <Textarea label="Note" value={note} onChange={(event) => setNote(event.target.value)} className="min-h-20" />
              {canUpdate && job.status === "draft" ? (
                <Button loading={busy === "confirm"} onClick={() => run("confirm", billingService.confirmJob)}>Confirm</Button>
              ) : null}
              {canFulfill && job.status === "confirmed" ? (
                <Button loading={busy === "start"} onClick={() => run("start", billingService.startJob)}>Start work</Button>
              ) : null}
              {canFulfill && job.status === "in_progress" ? (
                <Button variant="outline" loading={busy === "await"} onClick={() => run("await", billingService.awaitAuthority)}>Waiting on authority</Button>
              ) : null}
              {canFulfill && ["in_progress", "awaiting_authority"].includes(job.status) ? (
                <Button loading={busy === "deliver"} onClick={() => run("deliver", billingService.deliverJob, { files: Array.isArray(files) ? files : files ? [files] : [] })}>
                  Mark delivered
                </Button>
              ) : null}
              {canFulfill && job.status === "delivered" ? (
                <Button onClick={() => setCloseOpen(true)}>Close job</Button>
              ) : null}
              {canUpdate && ["draft", "confirmed", "in_progress", "awaiting_authority"].includes(job.status) ? (
                <Button variant="danger" loading={busy === "cancel"} onClick={() => run("cancel", billingService.cancelJob)}>Cancel</Button>
              ) : null}
              {canInvoice && !job.invoiceId ? (
                <Link href={`${ROUTES.billingInvoices}/new?jobId=${job.id}&leadId=${job.leadId}`}>
                  <Button variant="outline">Create invoice</Button>
                </Link>
              ) : null}
              {job.invoiceId ? (
                <Link href={`${ROUTES.billingInvoices}/${job.invoiceId}`} className="block text-sm text-primary">
                  Open invoice
                </Link>
              ) : null}
              {job.verificationCaseId ? (
                <Link href={verificationCasePath(job.verificationCaseId)} className="block text-sm text-primary">
                  Open verification case
                </Link>
              ) : null}
              {job.leadId ? (
                <Link href={`${ROUTES.suppliers}/${job.leadId}`} className="block text-sm text-primary">
                  Open supplier
                </Link>
              ) : null}
            </CardBody>
          </Card>
          {job.notes ? (
            <Card>
              <CardBody>
                <p className="text-xs text-muted">Notes</p>
                <p className="text-sm">{job.notes}</p>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>

      <ConfirmationDialog
        open={closeOpen}
        title="Close job"
        description="Close this job. If the invoice is unpaid, closing will waive the payment requirement."
        confirmLabel="Close"
        onClose={() => setCloseOpen(false)}
        onConfirm={async () => {
          setCloseOpen(false);
          await run("close", billingService.closeJob, { waivePayment: true });
        }}
      />
    </div>
  );
}
