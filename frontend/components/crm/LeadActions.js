"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthProvider";
import { PERMISSIONS } from "@/constants/permissions";
import { cn } from "@/lib/utils";

function stopCardDrag(event) {
  event.stopPropagation();
}

export function LeadActions({ lead, onDelete, className }) {
  const { can } = useAuth();

  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      onMouseDown={stopCardDrag}
      onPointerDown={stopCardDrag}
      onClick={stopCardDrag}
    >
      {can(PERMISSIONS.LEADS_UPDATE) ? (
        <Link
          href={`/leads/${lead.id}/edit`}
          aria-label="Edit lead"
          title="Edit"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text transition hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Pencil className="h-4 w-4" />
        </Link>
      ) : null}
      {can(PERMISSIONS.LEADS_DELETE) ? (
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-danger hover:bg-danger/10 hover:text-danger"
          aria-label="Delete lead"
          title="Delete"
          onClick={() => onDelete(lead)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
