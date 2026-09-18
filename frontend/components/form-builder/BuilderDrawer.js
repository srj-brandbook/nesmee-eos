"use client";

import { cn } from "@/lib/utils";

export function BuilderDrawer({ open, onClose, side = "left", title, children, overlayClassName, hideHeader = false }) {
  if (!open) return null;
  return (
    <div className={cn("fixed inset-0 z-40 lg:hidden", overlayClassName)}>
      <button type="button" className="absolute inset-0 bg-slate-950/40" onClick={onClose} aria-label="Close panel" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "absolute top-0 flex h-full w-[min(100%,20rem)] max-w-full flex-col overflow-y-auto overflow-x-hidden border-border bg-surface shadow-lg",
          side === "left" ? "left-0 border-r" : "right-0 border-l"
        )}
      >
        {hideHeader ? null : (
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm font-semibold">{title}</p>
            <button type="button" className="rounded-md px-2 py-1 text-sm text-muted hover:bg-slate-100" onClick={onClose}>
              Close
            </button>
          </div>
        )}
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</div>
      </div>
    </div>
  );
}
