"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { formService } from "@/services/formService";
import { FormRuntime } from "@/components/form-builder/runtime/FormRuntime";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/contexts/ToastProvider";
import { ROUTES, onboardingSubjectPath } from "@/constants/routes";
import { labelFor, ONBOARDING_STATUSES, onboardingStatusVariant } from "@/constants/forms";
import { ApiClientError } from "@/lib/api/apiClient";

export function OnboardingFill() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const [item, setItem] = useState(null);
  const [definition, setDefinition] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  async function load() {
    const response = await formService.onboarding.get(params.submissionId);
    const onboarding = response.data.onboarding;
    setItem(onboarding);
    if (!onboarding.definition) {
      setError("Bound form is missing");
      return;
    }
    setDefinition(onboarding.definition);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message || "Unable to load onboarding"));
  }, [params.submissionId]);

  if (error) return <Alert variant="danger">{error}</Alert>;
  if (!item || !definition) return <Spinner label="Loading onboarding" />;

  const readOnly = item.status !== "draft";
  const subjectHref = onboardingSubjectPath(item) || ROUTES.onboarding;

  async function saveDraft(result) {
    setSavingDraft(true);
    try {
      const response = await formService.onboarding.saveDraft(item.id, { values: result.values });
      setItem(response.data.onboarding);
      toast.success("Draft saved");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not save draft");
    } finally {
      setSavingDraft(false);
    }
  }

  async function submit(result) {
    setSubmitting(true);
    try {
      await formService.onboarding.submit(item.id, { values: result.values });
      toast.success("Submitted for review");
      router.push(subjectHref);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto min-w-0 max-w-3xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs text-muted">
            <Link href={subjectHref} className="hover:text-text">
              {item.subject?.name || "Record"}
            </Link>
            {" · "}
            {item.purpose === "supplier_onboarding" ? "Supplier" : "Distributor"} onboarding
          </p>
          <h1 className="font-display text-2xl font-semibold">{definition.name}</h1>
        </div>
        <Badge variant={onboardingStatusVariant(item.status)}>{labelFor(ONBOARDING_STATUSES, item.status)}</Badge>
      </div>
      {readOnly ? <Alert>This onboarding is {labelFor(ONBOARDING_STATUSES, item.status).toLowerCase()} and can no longer be edited.</Alert> : null}
      <FormRuntime
        definition={definition}
        mode="fill"
        initialValues={item.values || {}}
        readOnly={readOnly}
        submitting={submitting}
        savingDraft={savingDraft}
        onSaveDraft={saveDraft}
        onSubmit={submit}
      />
      <div>
        <Link href={subjectHref}>
          <Button variant="outline">Back</Button>
        </Link>
      </div>
    </div>
  );
}
