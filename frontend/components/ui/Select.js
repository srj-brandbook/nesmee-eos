import { cn } from "@/lib/utils";

export function Select({ label, error, children, className, id, requiredMark, multiple, ...props }) {
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
      <select
        id={inputId}
        multiple={multiple}
        aria-invalid={Boolean(error)}
        className={cn(
          "w-full min-w-0 max-w-full rounded-md border bg-surface px-3 text-sm text-text outline-none ring-primary/30 focus:ring-4",
          multiple ? "min-h-28 py-2" : "h-10",
          error ? "border-danger ring-4 ring-danger/20" : "border-border",
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </label>
  );
}
