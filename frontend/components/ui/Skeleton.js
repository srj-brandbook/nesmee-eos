import { cn } from "@/lib/utils";

export function Skeleton({ className }) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200 dark:bg-slate-700", className)} />;
}
