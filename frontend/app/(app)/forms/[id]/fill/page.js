"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { FormRuntime } from "@/components/form-builder/runtime/FormRuntime";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { formService } from "@/services/formService";
import { useToast } from "@/contexts/ToastProvider";
import { ApiClientError } from "@/lib/api/apiClient";

function FillInner() {
  const params = useParams();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    formService
      .get(params.id)
      .then((response) => setForm(response.data.form))
      .catch((err) => setError(err.message || "Unable to load form"));
  }, [params.id]);

  if (error) return <Alert variant="danger">{error}</Alert>;
  if (!form) return <Spinner label="Loading form" />;
  const version = form.published;
  if (!version) {
    return (
      <Alert variant="warning">
        This form is not published yet.{" "}
        <Link className="underline" href={`${ROUTES.forms}/${form.id}`}>
          Open builder
        </Link>
      </Alert>
    );
  }

  const definition = {
    name: version.name || form.name,
    description: version.description || form.description,
    sections: version.sections,
    fields: version.fields,
    rules: version.rules,
    documents: version.documents,
    stages: version.stages,
  };

  async function handleSubmit(result) {
    setSubmitting(true);
    try {
      await formService.submit(form.id, { values: result.values, versionId: version.id });
      setDone(true);
      toast.success("Submission saved");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto min-w-0 max-w-3xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold">{definition.name}</h1>
          <p className="text-sm text-muted">Published v{version.version}</p>
        </div>
        <Link href={`${ROUTES.forms}/${form.id}/preview`}>
          <Button variant="outline">Preview</Button>
        </Link>
      </div>
      {done ? <Alert variant="success">Submission recorded against version {version.version}.</Alert> : null}
      <FormRuntime definition={definition} mode="fill" onSubmit={handleSubmit} submitting={submitting} />
    </div>
  );
}

export default function FormFillPage() {
  return (
    <PermissionGate permission={PERMISSIONS.FORMS_SUBMIT}>
      <FillInner />
    </PermissionGate>
  );
}
