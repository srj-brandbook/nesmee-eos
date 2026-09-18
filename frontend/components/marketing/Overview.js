export function Overview() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="grid items-center gap-10 md:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl font-semibold">Product overview</h2>
          <p className="mt-4 text-muted">
            Two independently deployable apps: a Next.js frontend and an Express API. MongoDB is only reached from the API.
            Future products add a module folder, a permission seed, and a page.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <p className="text-sm font-medium text-muted">Request path</p>
          <ol className="mt-4 space-y-2 text-sm">
            <li>Browser → Next.js App Router</li>
            <li>Central API client → Express /api/v1</li>
            <li>Service layer → Mongoose → MongoDB</li>
          </ol>
        </div>
      </div>
    </section>
  );
}
