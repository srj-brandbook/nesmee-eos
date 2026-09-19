"use client";

import { PermissionGate } from "@/components/layout/PermissionGate";
import { DocumentList } from "@/components/documents/DocumentList";
import { PERMISSIONS } from "@/constants/permissions";

export default function DocumentsPage() {
  return (
    <PermissionGate permission={PERMISSIONS.DOCUMENTS_VIEW}>
      <DocumentList />
    </PermissionGate>
  );
}
