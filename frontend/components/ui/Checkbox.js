export function Checkbox({ label, ...props }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-text">
      <input type="checkbox" className="h-4 w-4 rounded border-border text-primary" {...props} />
      {label}
    </label>
  );
}
