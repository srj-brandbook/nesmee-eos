const benefits = [
  "One system from supplier to destination market",
  "Landed cost and corridor risk before you quote",
  "Documents and invoices that share the same data",
  "Roles so export, finance, and leadership stay in their lanes",
];

export function Benefits() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="font-display text-3xl font-semibold">Why exporters run on Nesmee EOS</h2>
      <ul className="mt-6 grid gap-3 md:grid-cols-2">
        {benefits.map((item) => (
          <li key={item} className="rounded-md border border-border bg-surface px-4 py-3 text-sm">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
