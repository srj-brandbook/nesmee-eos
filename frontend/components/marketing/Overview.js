export function Overview() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="grid items-center gap-10 md:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl font-semibold">One OS from supplier to destination</h2>
          <p className="mt-4 text-muted">
            Nesmee EOS is the operating system for export businesses. Sourcing, markets, corridors, documents, and billing
            share one record of truth so ops, finance, and leadership stop stitching together spreadsheets and inboxes.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <p className="text-sm font-medium text-muted">How work moves</p>
          <ol className="mt-4 space-y-2 text-sm">
            <li>Source products, suppliers, and compliance</li>
            <li>Score markets and corridors</li>
            <li>Quote landed cost with FX, duty, and freight</li>
            <li>Issue documents, invoices, and collections</li>
          </ol>
        </div>
      </div>
    </section>
  );
}
