"use client";

import { cn } from "@/lib/utils";

export function Modal({ open, title, children, onClose, className }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-950/40" onClick={onClose} aria-label="Close dialog" />
      <div className={cn("relative z-10 w-full max-w-lg rounded-lg border border-border bg-surface p-5 shadow-lg", className)}>
        {title ? <h2 className="mb-4 font-display text-lg font-semibold">{title}</h2> : null}
        {children}
      </div>
    </div>
  );
}
