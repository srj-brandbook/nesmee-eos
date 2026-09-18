import { cn } from "@/lib/utils";

export function Textarea({ label, error, className, id, requiredMark, ...props }) {
  const inputId = id || props.name;
  return (
    <label className="block min-w-0 max-w-full space-y-1.5" htmlFor={inputId}>
      {label ? (
        <span className="text-sm font-medium text-text">
          {label}
          {requiredMark ? (
            <span className="ml-0.5 font-semibold text-danger" aria-label="required">
              *
            </span>
          ) : null}
        </span>
      ) : null}
      <textarea
        id={inputId}
        className={cn(
          "min-h-28 w-full min-w-0 max-w-full rounded-md border bg-surface px-3 py-2 text-sm text-text outline-none ring-primary/30 focus:ring-4",
          error ? "border-danger ring-4 ring-danger/20" : "border-border",
          className
        )}
        {...props}
      />
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </label>
  );
}
