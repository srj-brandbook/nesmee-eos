export function RequiredMark() {
  return (
    <span className="ml-0.5 font-semibold text-danger" aria-label="required">
      *
    </span>
  );
}

export function FieldLabel({ children, required, className = "text-sm font-medium text-text" }) {
  if (!children) return null;
  return (
    <span className={className}>
      {children}
      {required ? <RequiredMark /> : null}
    </span>
  );
}
