"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

export function Drawer({ open, onClose, children, side = "left", overlay = false }) {
  useEffect(() => {
    if (!open) return;
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className={cn("fixed inset-0 z-40", overlay ? "" : "lg:hidden")}>
      <button type="button" className="absolute inset-0 bg-slate-950/40" onClick={onClose} aria-label="Close menu" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={cn(
          "absolute top-0 flex h-full w-72 flex-col overflow-y-auto border-border bg-surface p-4 shadow-lg",
          side === "left" ? "left-0 border-r" : "right-0 border-l"
        )}
      >
        {children}
      </div>
    </div>
  );
}
