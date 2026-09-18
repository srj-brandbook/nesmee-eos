import { cn } from "@/lib/utils";

const variants = {
  info: "border-indigo-200 bg-indigo-50 text-indigo-800",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

export function Alert({ children, variant = "info", className }) {
  return <div className={cn("rounded-md border px-4 py-3 text-sm", variants[variant], className)}>{children}</div>;
}
