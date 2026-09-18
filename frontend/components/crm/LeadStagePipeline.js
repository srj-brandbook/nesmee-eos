"use client";

import { Check } from "lucide-react";
import { LEAD_PIPELINE, LEAD_STAGES, PROCESS_STAGES, labelFor } from "@/constants/crm";
import { cn } from "@/lib/utils";

export function LeadStagePipeline({ stage, onSelect, disabled }) {
  const closedOut = stage === "lost" || stage === "disqualified";
  const inProcess = PROCESS_STAGES.includes(stage);
  const currentIndex = LEAD_PIPELINE.findIndex((item) => item.value === stage);

  return (
    <ol className="flex min-w-0 flex-wrap items-center gap-1">
      {LEAD_PIPELINE.map((item, index) => {
        const current = item.value === stage;
        const complete = !closedOut && currentIndex > index;
        const reachable =
          !disabled &&
          !closedOut &&
          (current ||
            (inProcess && PROCESS_STAGES.includes(item.value)) ||
            (item.value === "converted" && inProcess) ||
            (item.value === "won" && stage === "converted"));
        return (
          <li key={item.value} className="flex items-center gap-1">
            {index > 0 ? (
              <span className={cn("hidden h-px w-4 sm:block", complete || current ? "bg-primary" : "bg-border")} />
            ) : null}
            <button
              type="button"
              disabled={!reachable}
              onClick={() => onSelect?.(item.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                current && !closedOut && "border-primary bg-primary/10 text-primary",
                complete && "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
                !current && !complete && "border-border bg-surface text-muted",
                reachable && "hover:border-primary/50 hover:text-text",
                !reachable && "cursor-default"
              )}
            >
              {complete ? <Check className="h-3 w-3" /> : <span>{index + 1}</span>}
              {item.label}
            </button>
          </li>
        );
      })}
      {closedOut ? (
        <li className="flex items-center gap-1">
          <span className="hidden h-px w-4 bg-danger sm:block" />
          <span className="rounded-full border border-danger/30 bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger">
            {labelFor(LEAD_STAGES, stage)}
          </span>
        </li>
      ) : null}
    </ol>
  );
}
