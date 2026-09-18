"use client";

import { useParams } from "next/navigation";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { FormBuilderProvider } from "@/hooks/useFormBuilder";
import { FormBuilderWorkspace } from "@/components/form-builder/FormBuilderWorkspace";
import { PERMISSIONS } from "@/constants/permissions";

export default function FormBuilderPage() {
  const params = useParams();
  return (
    <PermissionGate permission={PERMISSIONS.FORMS_VIEW}>
      <FormBuilderProvider formId={params.id}>
        <div className="h-full min-h-0 min-w-0">
          <FormBuilderWorkspace />
        </div>
      </FormBuilderProvider>
    </PermissionGate>
  );
}
