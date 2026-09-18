import { Button } from "./Button";

export function Pagination({ page, totalPages, onPage }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 px-4 py-3">
      <p className="text-sm text-muted">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
