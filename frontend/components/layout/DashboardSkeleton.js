import { Skeleton } from "@/components/ui/Skeleton";

export function DashboardSkeleton() {
  return (
    <div className="flex h-dvh max-h-dvh overflow-hidden bg-bg">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-surface lg:block">
        <div className="flex h-16 items-center gap-2 border-b border-border px-4">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="space-y-2 p-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
          <Skeleton className="mt-4 h-3 w-12" />
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-16 items-center justify-between gap-4 border-b border-border bg-surface/80 px-4 md:px-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="hidden h-10 max-w-md flex-1 md:block" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col px-4 md:px-6">
          <Skeleton className="my-2 h-3 w-36" />
          <main className="flex-1 space-y-4 py-3 md:py-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
            <Skeleton className="h-64" />
          </main>
        </div>
      </div>
    </div>
  );
}
