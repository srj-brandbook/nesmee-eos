export function Radio({ label, ...props }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-text">
      <input type="radio" className="h-4 w-4 border-border text-primary" {...props} />
      {label}
    </label>
  );
}
