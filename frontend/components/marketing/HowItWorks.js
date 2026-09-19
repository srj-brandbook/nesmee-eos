const steps = [
  ["Source", "Qualify suppliers, products, and compliance in one workspace."],
  ["Route", "Choose markets and corridors, then price landed cost before you quote."],
  ["Operate", "Issue documents, invoices, and alerts as shipments move."],
];

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="font-display text-3xl font-semibold">How it works</h2>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {steps.map(([title, copy], index) => (
          <div key={title} className="rounded-lg border border-border bg-surface p-5">
            <p className="text-sm text-primary">0{index + 1}</p>
            <h3 className="mt-2 font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-muted">{copy}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
