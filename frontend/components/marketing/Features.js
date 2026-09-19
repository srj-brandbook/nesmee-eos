import { Card, CardBody } from "@/components/ui/Card";

const items = [
  ["Markets & corridors", "Score destinations, track trade lanes, and see margin and risk in one control center."],
  ["Landed cost", "FX, duties, freight, and Incoterms in a calculator you can reuse before you quote."],
  ["Sourcing", "Leads, suppliers, products, and verification live in the same workspace as export."],
  ["Documents & billing", "Templates, invoices, and payments share the same records—no copy-paste between tools."],
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="font-display text-3xl font-semibold">Everything an export team runs on</h2>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {items.map(([title, copy]) => (
          <Card key={title}>
            <CardBody>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted">{copy}</p>
            </CardBody>
          </Card>
        ))}
      </div>
    </section>
  );
}
