"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { documentService } from "@/services/documentService";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { GenerateDocumentModal } from "./GenerateDocumentModal";
import { DocumentModal } from "./DocumentModal";
import { DocumentWorkspace } from "./DocumentWorkspace";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { DOCUMENT_TYPES, labelFor, statusVariant } from "@/constants/documents";
import { formatDate } from "@/lib/utils";

export function SubjectDocumentsPanel({ subjectType = "lead", subjectId }) {
  const { can } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openGenerate, setOpenGenerate] = useState(false);
  const [openId, setOpenId] = useState(null);

  async function load() {
    const response = await documentService.list({ subjectType, subjectId, limit: 50, sort: "-updatedAt" });
    setItems(response.data.items || []);
  }

  useEffect(() => {
    if (!subjectId) return;
    setLoading(true);
    load()
      .catch(() => toast.error("Unable to load documents"))
      .finally(() => setLoading(false));
  }, [subjectId, subjectType]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Documents</h2>
        {can(PERMISSIONS.DOCUMENTS_CREATE) ? (
          <Button size="sm" onClick={() => setOpenGenerate(true)}>
            <Plus className="h-3.5 w-3.5" />
            New document
          </Button>
        ) : null}
      </div>
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : !items.length ? (
        <EmptyState
          title="No documents yet"
          description="Generate a proposal, NOC, or letter from a published template."
          actionLabel={can(PERMISSIONS.DOCUMENTS_CREATE) ? "New document" : undefined}
          onAction={can(PERMISSIONS.DOCUMENTS_CREATE) ? () => setOpenGenerate(true) : undefined}
        />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id}>
              <CardBody className="flex flex-wrap items-center justify-between gap-3">
                <button type="button" className="min-w-0 text-left" onClick={() => setOpenId(item.id)}>
                  <p className="truncate font-medium">{item.title}</p>
                  <p className="text-xs text-muted">
                    {item.docNumber || "No number"} · {labelFor(DOCUMENT_TYPES, item.type)} · {formatDate(item.updatedAt)}
                  </p>
                </button>
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant(item.status)}>{item.status.replace("_", " ")}</Badge>
                  <Link href={`${ROUTES.documents}/${item.id}`} className="text-sm text-primary hover:underline">
                    Open
                  </Link>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
      <GenerateDocumentModal
        open={openGenerate}
        onClose={() => setOpenGenerate(false)}
        subjectType={subjectType}
        subjectId={subjectId}
        onGenerated={(doc) => {
          setOpenId(doc.id);
          load();
        }}
      />
      <DocumentModal
        open={Boolean(openId)}
        onClose={() => {
          setOpenId(null);
          load();
        }}
        title="Document"
        className="max-w-7xl"
      >
        {openId ? <DocumentWorkspace documentId={openId} compact /> : null}
      </DocumentModal>
    </div>
  );
}
