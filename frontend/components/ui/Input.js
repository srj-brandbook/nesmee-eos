import { cn } from "@/lib/utils";

export function Input({ label, error, className, id, hint, requiredMark, ...props }) {
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
      <input
        id={inputId}
        className={cn(
          "h-10 w-full min-w-0 max-w-full rounded-md border bg-surface px-3 text-sm text-text outline-none ring-primary/30 transition placeholder:text-muted focus:ring-4",
          error ? "border-danger ring-4 ring-danger/20" : "border-border",
          className
        )}
        {...props}
      />
      {hint && !error ? <span className="text-xs text-muted">{hint}</span> : null}
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </label>
  );
}
