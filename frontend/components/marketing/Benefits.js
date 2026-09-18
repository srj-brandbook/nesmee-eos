const benefits = [
  "No TypeScript tax if your team ships JavaScript",
  "Security enforced on the API, not only in the UI",
  "Reusable dashboard shell for every future product",
  "Seeded Super Admin so a new environment is usable immediately",
];

export function Benefits() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="font-display text-3xl font-semibold">Why teams start here</h2>
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
