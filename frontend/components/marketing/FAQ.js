import { Accordion } from "@/components/ui/Accordion";

const items = [
  { q: "Is this TypeScript?", a: "No. Frontend and backend are JavaScript only." },
  { q: "Where is security enforced?", a: "On the Express API. UI permission checks only hide navigation and actions." },
  { q: "Can I add CRM or billing later?", a: "Yes. Follow docs/adding-module.md. Do not fork auth or the API client." },
  { q: "How do emails work locally?", a: "Use Mailhog via Docker Compose. Verification and reset links appear at localhost:8025." },
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
