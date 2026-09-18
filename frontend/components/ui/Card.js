import { cn } from "@/lib/utils";

export function Card({ className, children }) {
  return <div className={cn("rounded-lg border border-border bg-surface shadow-sm", className)}>{children}</div>;
}

export function CardHeader({ className, children }) {
  return <div className={cn("border-b border-border px-5 py-4", className)}>{children}</div>;
}

export function CardBody({ className, children }) {
  return <div className={cn("p-5", className)}>{children}</div>;
}
