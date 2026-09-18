"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formService } from "@/services/formService";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Textarea } from "@/components/ui/Textarea";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES, directoryProfilePath } from "@/constants/routes";
import { labelFor, ONBOARDING_STATUSES, onboardingStatusVariant } from "@/constants/forms";
import { ApiClientError } from "@/lib/api/apiClient";
import { formatDateTime } from "@/lib/utils";

export function OnboardingPanel({
  subjectType,
  subjectId,
  canStart,
  onStarted,
  startAction,
}) {
  const toast = useToast();
  const router = useRouter();
  const { can } = useAuth();
  const [data, setData] = useState({ onboarding: null, formConfigured: false });
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const item = data.onboarding;

  async function load() {
    const response = await formService.onboarding.subject(subjectType, subjectId);
    setData(response.data);
  }

  useEffect(() => {
    if (!subjectId) return;
    load().catch(() => toast.error("Unable to load onboarding"));
  }, [subjectType, subjectId]);

  async function start() {
    setLoading(true);
    try {
      const result = await startAction();
      toast.success("Onboarding started");
      onStarted?.(result);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not start onboarding");
    } finally {
      setLoading(false);
    }
  }

  async function review(decision) {
    if (!item) return;
    setLoading(true);
    try {
      await formService.onboarding.review(item.id, { decision, note });
      toast.success(decision === "approved" ? "Onboarding approved" : "Onboarding returned");
      setNote("");
      if (decision === "approved") {
        router.push(directoryProfilePath(subjectType, subjectId));
        return;
      }
      onStarted?.();
      await load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not review onboarding");
    } finally {
      setLoading(false);
    }
  }

  const canReview =
    item?.status === "submitted" &&
    ((subjectType === "lead" && can(PERMISSIONS.LEADS_CONVERT)) ||
      (subjectType === "buyer" && can(PERMISSIONS.EXPORT_BUYERS_UPDATE)));
  const fillHref = item ? `${ROUTES.onboarding}/${item.id}` : null;

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-2">
        <span>Onboarding</span>
        {item ? <Badge variant={onboardingStatusVariant(item.status)}>{labelFor(ONBOARDING_STATUSES, item.status)}</Badge> : null}
      </CardHeader>
      <CardBody className="space-y-3">
        {!data.formConfigured && !item ? (
          <Alert variant="warning">
            Publish a form and tag it as {subjectType === "lead" ? "supplier" : "distributor"} onboarding in{" "}
            <Link className="underline" href={ROUTES.forms}>
              Forms
            </Link>
            .
          </Alert>
        ) : null}
        {item ? (
          <>
            <p className="text-sm">
              {item.form?.name || "Onboarding form"}
              {item.version?.version ? ` · v${item.version.version}` : ""}
            </p>
            <p className="text-xs text-muted">
              {item.submittedAt ? `Submitted ${formatDateTime(item.submittedAt)}` : `Updated ${formatDateTime(item.updatedAt)}`}
            </p>
            {item.reviewNote ? <p className="text-sm text-muted">Review note: {item.reviewNote}</p> : null}
            <div className="flex flex-wrap gap-2">
              {item.status === "draft" && can(PERMISSIONS.FORMS_SUBMIT) ? (
                <Link href={fillHref}>
                  <Button size="sm">Continue onboarding</Button>
                </Link>
              ) : null}
              {item.status !== "draft" && fillHref ? (
                <Link href={fillHref}>
                  <Button size="sm" variant="outline">
                    View submission
                  </Button>
                </Link>
              ) : null}
              {item.status === "rejected" && canStart ? (
                <Button type="button" size="sm" loading={loading} onClick={start}>
                  Start new draft
                </Button>
              ) : null}
            </div>
            {canReview ? (
              <div className="space-y-2 border-t border-border pt-3">
                <Textarea label="Review note" value={note} onChange={(event) => setNote(event.target.value)} />
                <div className="flex gap-2">
                  <Button type="button" size="sm" loading={loading} onClick={() => review("approved")}>
                    Approve
                  </Button>
                  <Button type="button" size="sm" variant="outline" loading={loading} onClick={() => review("rejected")}>
                    Reject
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted">No onboarding started yet.</p>
            {canStart && data.formConfigured ? (
              <Button type="button" size="sm" loading={loading} onClick={start}>
                Start onboarding
              </Button>
            ) : null}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
