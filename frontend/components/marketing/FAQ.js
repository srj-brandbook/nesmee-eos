import { Accordion } from "@/components/ui/Accordion";

const items = [
  { q: "What is Nesmee EOS?", a: "An export operating system. It connects sourcing, markets, corridors, documents, and billing in one workspace." },
  { q: "Who is it for?", a: "Exporters, trading houses, and sourcing teams who need one system from supplier to destination market." },
  { q: "Does it handle landed cost?", a: "Yes. FX, duties, freight, and Incoterms are built into the calculator so you can quote with margin in view." },
  { q: "How do I get started?", a: "Create an account, verify your email, and open the workspace. Markets, corridors, and documents are ready from day one." },
];

export function FAQ() {
  return (
    <section id="faq" className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="font-display text-3xl font-semibold">FAQ</h2>
      <div className="mt-8">
        <Accordion items={items} />
      </div>
    </section>
  );
}
