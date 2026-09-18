import { cn } from "@/lib/utils";

const variants = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
  default: "border-border bg-surface text-text",
};

export function Toast({ children, variant = "default" }) {
  return <div className={cn("rounded-md border px-4 py-3 text-sm shadow-md", variants[variant])}>{children}</div>;
}
