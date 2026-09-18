import { cn } from "@/lib/utils";

const variants = {
  default: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  primary: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200",
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200",
  danger: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-200",
};

export function Badge({ children, variant = "default", className }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", variants[variant], className)}>
      {children}
    </span>
  );
}
