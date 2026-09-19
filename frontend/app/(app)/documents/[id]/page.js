"use client";

import { useParams } from "next/navigation";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { DocumentWorkspace } from "@/components/documents/DocumentWorkspace";
import { PERMISSIONS } from "@/constants/permissions";

export default function DocumentPage() {
  const { id } = useParams();
  return (
    <PermissionGate permission={PERMISSIONS.DOCUMENTS_VIEW}>
      <div className="h-full min-h-0 min-w-0 rounded-lg border border-border bg-surface">
        <DocumentWorkspace documentId={id} />
      </div>
    </PermissionGate>
  );
}
