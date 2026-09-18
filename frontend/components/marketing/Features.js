import { Card, CardBody } from "@/components/ui/Card";

const items = [
  ["Authentication", "Signup, verify, reset, and session revoke without storing tokens in the browser."],
  ["RBAC", "Database-driven roles and permissions. Super Admin bypasses, everyone else is explicit."],
  ["Admin suite", "Users, roles, settings, notifications, and audit logs ready on day one."],
  ["API-first", "Versioned Express REST API with one response envelope and layered services."],
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="font-display text-3xl font-semibold">Everything common SaaS products need</h2>
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
