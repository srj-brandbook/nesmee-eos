"use client";

import {
  ArrowRightLeft,
  Calendar,
  CalendarClock,
  PhoneCall,
  Plus,
  StickyNote,
  Video,
} from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LeadProcessPanel } from "./LeadProcessPanel";
import { activityWhen, isActivityOverdue, isFutureActivity } from "@/constants/crm";
import { cn } from "@/lib/utils";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "note", label: "Notes", icon: StickyNote },
  { value: "call", label: "Calls", icon: PhoneCall },
  { value: "follow_up", label: "Follow-ups", icon: CalendarClock },
  { value: "appointment", label: "Appointments", icon: Calendar },
  { value: "meeting", label: "Meetings", icon: Video },
  { value: "status_change", label: "Status", icon: ArrowRightLeft },
];

function byWhenAsc(a, b) {
  return new Date(activityWhen(a)) - new Date(activityWhen(b));
}

function byWhenDesc(a, b) {
  return new Date(activityWhen(b)) - new Date(activityWhen(a));
}

export function LeadHistory({
  leadId,
  leadName,
  contacts,
  items,
  filter,
  onFilter,
  onLog,
  onChanged,
  canLog,
}) {
  const scoped = useMemo(
    () =>
      items.filter((item) => {
        if (item.type === "task") return false;
        return filter === "all" || item.type === filter;
      }),
    [filter, items]
  );

  const overdue = scoped.filter(isActivityOverdue).sort(byWhenAsc);
  const upcoming = scoped.filter(isFutureActivity).sort(byWhenAsc);
  const history = scoped.filter((item) => !isActivityOverdue(item) && !isFutureActivity(item)).sort(byWhenDesc);
  const logType = filter === "all" || filter === "status_change" ? "note" : filter;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((item) => {
            const active = filter === item.value;
            const Icon = item.icon;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => onFilter(item.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted hover:border-primary/40 hover:text-text"
                )}
              >
                {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                {item.label}
              </button>
            );
          })}
        </div>
        {canLog ? (
          <Button size="sm" variant="outline" onClick={() => onLog(logType)}>
            <Plus className="h-3.5 w-3.5" />
            Log
          </Button>
        ) : null}
      </div>

      {scoped.length === 0 ? (
        <EmptyState
          className="px-2 py-10"
          title="No history yet"
          description="Status changes, notes, calls, and completed work appear here. Upcoming appointments and follow-ups show above the record."
          actionLabel={canLog ? "Log activity" : undefined}
          onAction={canLog ? () => onLog(logType) : undefined}
        />
      ) : (
        <>
          {overdue.length ? (
            <HistorySection title="Overdue" count={overdue.length} tone="danger">
              <LeadProcessPanel
                embedded
                hideForm
                type={filter === "all" ? undefined : filter}
                leadId={leadId}
                leadName={leadName}
                contacts={contacts}
                items={overdue}
                onChanged={onChanged}
              />
            </HistorySection>
          ) : null}
          {upcoming.length ? (
            <HistorySection title="Upcoming" count={upcoming.length}>
              <LeadProcessPanel
                embedded
                hideForm
                type={filter === "all" ? undefined : filter}
                leadId={leadId}
                leadName={leadName}
                contacts={contacts}
                items={upcoming}
                onChanged={onChanged}
              />
            </HistorySection>
          ) : null}
          {history.length ? (
            <HistorySection title="History" count={history.length}>
              <LeadProcessPanel
                embedded
                hideForm
                type={filter === "all" ? undefined : filter}
                leadId={leadId}
                leadName={leadName}
                contacts={contacts}
                items={history}
                onChanged={onChanged}
              />
            </HistorySection>
          ) : null}
        </>
      )}
    </div>
  );
}

function HistorySection({ title, count, tone, children }) {
  return (
    <Card>
      <CardHeader>
        <h3 className={cn("text-sm font-semibold", tone === "danger" ? "text-danger" : "")}>
          {title}
          {count ? ` · ${count}` : ""}
        </h3>
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
}
