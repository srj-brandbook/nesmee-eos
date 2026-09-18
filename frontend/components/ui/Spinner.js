export function Spinner({ label = "Loading" }) {
  return (
    <div className="flex items-center justify-center gap-2 text-sm text-muted" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
      {label}
    </div>
  );
}
