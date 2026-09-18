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

function PreviewInner() {
  const params = useParams();
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    formService
      .get(params.id)
      .then((response) => setForm(response.data.form))
      .catch((err) => setError(err.message || "Unable to load form"));
  }, [params.id]);

  if (error) return <Alert variant="danger">{error}</Alert>;
  if (!form) return <Spinner label="Loading preview" />;
  const version = form.draft || form.published;
  if (!version) return <Alert>This form has no version to preview.</Alert>;

  const definition = {
    name: version.name || form.name,
    description: version.description || form.description,
    sections: version.sections,
    fields: version.fields,
    rules: version.rules,
    documents: version.documents,
    stages: version.stages,
  };

  return (
    <div className="mx-auto min-w-0 max-w-3xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold">{definition.name}</h1>
          <p className="text-sm text-muted">Preview uses the same validation and rule engines as runtime.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`${ROUTES.forms}/${form.id}`}>
            <Button variant="outline">Back to builder</Button>
          </Link>
          {form.published ? (
            <Link href={`${ROUTES.forms}/${form.id}/fill`}>
              <Button>Fill published version</Button>
            </Link>
          ) : null}
        </div>
      </div>
      <FormRuntime definition={definition} mode="preview" />
    </div>
  );
}

export default function FormPreviewPage() {
  return (
    <PermissionGate permission={PERMISSIONS.FORMS_VIEW}>
      <PreviewInner />
    </PermissionGate>
  );
}
