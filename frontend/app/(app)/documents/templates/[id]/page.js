"use client";

import { useParams } from "next/navigation";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { TemplateStudio } from "@/components/documents/TemplateStudio";
import { PERMISSIONS } from "@/constants/permissions";

export default function TemplateStudioPage() {
  const { id } = useParams();
  return (
    <PermissionGate permission={PERMISSIONS.DOCUMENTS_VIEW}>
      <div className="h-full min-h-0 min-w-0">
        <TemplateStudio templateId={id} />
      </div>
    </PermissionGate>
  );
}
