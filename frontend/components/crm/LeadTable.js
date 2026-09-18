"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Columns3, Plus, Table2 } from "lucide-react";
import { leadService } from "@/services/crmService";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { usePagination } from "@/hooks/usePagination";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Table } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { Avatar } from "@/components/ui/Avatar";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { KanbanBoard } from "./KanbanBoard";
import { LeadActions } from "./LeadActions";
import { LeadStatusModal } from "./LeadStatusModal";
import { LEAD_STAGES, LEAD_SOURCES, labelFor, locationLabel, stageVariant } from "@/constants/crm";
import { PERMISSIONS } from "@/constants/permissions";
import { cn, formatDate } from "@/lib/utils";
import { ApiClientError } from "@/lib/api/apiClient";
import { Card } from "@/components/ui/Card";

export function LeadTable() {
  const { can } = useAuth();
  const toast = useToast();
  const { value, setValue, debounced } = useDebouncedSearch();
  const { page, setPage, limit } = usePagination({ page: 1, limit: 50 });
  const [stage, setStage] = useState("");
  const [source, setSource] = useState("");
  const [view, setView] = useState("table");
  const [data, setData] = useState({ items: [], pagination: { page: 1, totalPages: 1 } });
  const [statusAction, setStatusAction] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    const response = await leadService.list({
      search: debounced,
      stage,
      source,
      sort: "-createdAt",
      page: view === "board" ? 1 : page,
      limit: view === "board" ? 100 : limit,
    });
    setData(response.data);
  }

  useEffect(() => {
    load().catch(() => toast.error("Unable to load leads"));
  }, [debounced, stage, source, page, limit, view]);

  async function moveLead(id, nextStage) {
    const lead = data.items.find((item) => item.id === id);
    if (!lead || nextStage === lead.stage) return;
    if (["converted", "won"].includes(nextStage) && !can(PERMISSIONS.LEADS_CONVERT)) return;
    if (!["converted", "won"].includes(nextStage) && !can(PERMISSIONS.LEADS_UPDATE)) return;
    setStatusAction({ lead, action: nextStage });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await leadService.remove(pendingDelete.id);
      toast.success("Lead deleted");
      setPendingDelete(null);
      if (data.items.length === 1 && page > 1) setPage(page - 1);
      else await load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not delete lead");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Manufacturer leads</h1>
          <p className="text-sm text-muted">Find and qualify manufacturers to convert into export suppliers.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-border p-0.5">
            <Button
              size="icon"
              variant={view === "table" ? "primary" : "ghost"}
              className={cn("h-8 w-8", view !== "table" && "text-muted")}
              aria-label="Table view"
              aria-pressed={view === "table"}
              title="Table view"
              onClick={() => setView("table")}
            >
              <Table2 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant={view === "board" ? "primary" : "ghost"}
              className={cn("h-8 w-8", view !== "board" && "text-muted")}
              aria-label="Board view"
              aria-pressed={view === "board"}
              title="Board view"
              onClick={() => setView("board")}
            >
              <Columns3 className="h-4 w-4" />
            </Button>
          </div>
          {can(PERMISSIONS.LEADS_CREATE) ? (
            <Link href="/leads/new">
              <Button>
                <Plus className="h-4 w-4" />
                New lead
              </Button>
            </Link>
          ) : null}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Input
          label="Search"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setPage(1);
          }}
        />
        <Select
          label="Status"
          value={stage}
          onChange={(event) => {
            setStage(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {LEAD_STAGES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
        <Select
          label="Source"
          value={source}
          onChange={(event) => {
            setSource(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All sources</option>
          {LEAD_SOURCES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
      </div>
      {view === "board" ? (
        <KanbanBoard
          columns={LEAD_STAGES}
          items={data.items}
          onMove={can(PERMISSIONS.LEADS_UPDATE) ? moveLead : undefined}
          renderCard={(lead) => (
            <div>
              <Link href={`/leads/${lead.id}`} className="block font-medium leading-5 text-primary hover:underline">
                {lead.name}
              </Link>
              <p className="mt-1 text-xs text-muted">{locationLabel(lead)}</p>
              <p className="mt-1 text-xs text-muted">
                {lead.primaryContact?.name || lead.products || lead.owner?.name || "No contact yet"}
              </p>
              <LeadActions className="mt-2 -mb-1 -ml-1" lead={lead} onDelete={setPendingDelete} />
            </div>
          )}
        />
      ) : (
        <Card>
          <Table
            empty="No manufacturer leads yet"
            columns={[
              {
                key: "name",
                label: "Manufacturer",
                render: (row) => (
                  <div>
                    <Link href={`/leads/${row.id}`} className="font-medium text-primary hover:underline">
                      {row.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted">{locationLabel(row)}</p>
                  </div>
                ),
              },
              {
                key: "contact",
                label: "Primary contact",
                render: (row) => row.primaryContact?.name || "—",
              },
              { key: "products", label: "Products", render: (row) => row.products || "—" },
              {
                key: "stage",
                label: "Status",
                render: (row) => <Badge variant={stageVariant(row.stage)}>{labelFor(LEAD_STAGES, row.stage)}</Badge>,
              },
              { key: "source", label: "Source", render: (row) => labelFor(LEAD_SOURCES, row.source) },
              {
                key: "createdAt",
                label: "Created",
                render: (row) => <span className="text-muted">{formatDate(row.createdAt)}</span>,
              },
              {
                key: "owner",
                label: "Owner",
                render: (row) =>
                  row.owner ? (
                    <span className="inline-flex" title={row.owner.name} aria-label={row.owner.name}>
                      <Avatar name={row.owner.name} src={row.owner.avatarUrl} size={32} />
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  ),
              },
              {
                key: "actions",
                label: "",
                render: (row) => (
                  <LeadActions className="justify-end" lead={row} onDelete={setPendingDelete} />
                ),
              },
            ]}
            rows={data.items}
          />
          <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPage={setPage} />
        </Card>
      )}
      <LeadStatusModal
        open={Boolean(statusAction)}
        lead={statusAction?.lead}
        action={statusAction?.action}
        onClose={() => setStatusAction(null)}
        onDone={() => load()}
      />
      <ConfirmationDialog
        open={Boolean(pendingDelete)}
        title="Delete manufacturer lead"
        description={`${pendingDelete?.name || "This manufacturer"} will be archived and removed from the sourcing pipeline. This cannot be undone from the UI.`}
        confirmLabel="Delete"
        loading={deleting}
        onClose={() => !deleting && setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
