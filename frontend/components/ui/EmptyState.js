import { Button } from "./Button";
import { cn } from "@/lib/utils";

export function EmptyState({ title, description, actionLabel, onAction, className }) {
  return (
    <div className={cn("px-6 py-16 text-center", className)}>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {description ? <p className="mt-2 text-sm text-muted">{description}</p> : null}
      {actionLabel ? (
        <Button className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
