"use client";

import { useParams } from "next/navigation";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { DocumentPrintView } from "@/components/documents/DocumentPrintView";
import { PERMISSIONS } from "@/constants/permissions";

export default function DocumentPrintPage() {
  const { id } = useParams();
  return (
    <PermissionGate permission={PERMISSIONS.DOCUMENTS_VIEW}>
      <DocumentPrintView documentId={id} />
    </PermissionGate>
  );
}
