"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { TemplateList } from "@/components/documents/TemplateList";
import { PERMISSIONS } from "@/constants/permissions";

export default function DocumentTemplatesPage() {
  return (
    <PermissionGate permission={PERMISSIONS.DOCUMENTS_VIEW}>
      <TemplateList />
    </PermissionGate>
  );
}
