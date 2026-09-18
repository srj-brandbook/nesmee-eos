"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { FormList } from "@/components/form-builder/FormList";
import { PERMISSIONS } from "@/constants/permissions";

export default function FormsPage() {
  return (
    <PermissionGate permission={PERMISSIONS.FORMS_VIEW}>
      <FormList />
    </PermissionGate>
  );
}
