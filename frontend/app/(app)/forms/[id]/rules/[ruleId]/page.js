"use client";

import { useParams } from "next/navigation";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { FormBuilderProvider } from "@/hooks/useFormBuilder";
import { RuleBuilderWorkspace } from "@/components/form-builder/RuleBuilderWorkspace";
import { PERMISSIONS } from "@/constants/permissions";

export default function RuleBuilderPage() {
  const params = useParams();
  return (
    <PermissionGate permission={PERMISSIONS.FORMS_VIEW}>
      <FormBuilderProvider formId={params.id}>
        <div className="h-full min-h-0 min-w-0">
          <RuleBuilderWorkspace ruleId={params.ruleId} />
        </div>
      </FormBuilderProvider>
    </PermissionGate>
  );
}
