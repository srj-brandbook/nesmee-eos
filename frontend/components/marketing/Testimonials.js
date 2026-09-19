const quotes = [
  ["We finally see margin by corridor before we quote.", "Priya Shah", "Export manager"],
  ["Suppliers, documents, and invoices live in one place instead of five inboxes.", "Daniel Okonkwo", "Operations"],
];

export function Testimonials() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="font-display text-3xl font-semibold">What teams say</h2>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {quotes.map(([quote, name, role]) => (
          <blockquote key={name} className="rounded-lg border border-border bg-surface p-6">
            <p className="text-lg">“{quote}”</p>
            <footer className="mt-4 text-sm text-muted">
              {name} · {role}
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}
