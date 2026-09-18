import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-primary text-white hover:opacity-90",
  secondary: "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900",
  outline: "border border-border bg-surface text-text hover:bg-slate-50 dark:hover:bg-slate-800",
  ghost: "text-text hover:bg-slate-100 dark:hover:bg-slate-800",
  danger: "bg-danger text-white hover:opacity-90",
};

const sizes = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
  icon: "h-9 w-9 p-0",
};

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  type = "button",
  disabled,
  loading,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}
