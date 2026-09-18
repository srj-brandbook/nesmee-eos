import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";

const plans = [
  ["Starter", "$0", "Internal tools and prototypes", ["Unlimited users in self-host", "Email auth", "RBAC"]],
  ["Growth", "$49", "Marketing placeholder", ["Everything in Starter", "Priority support placeholder", "Audit exports later"]],
  ["Scale", "Talk to us", "When billing becomes a module", ["SSO later", "Orgs later", "Custom deployment"]],
];

export function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="font-display text-3xl font-semibold">Pricing</h2>
      <p className="mt-2 text-sm text-muted">Marketing-only. Billing is a future module, not wired to Stripe.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {plans.map(([name, price, blurb, features]) => (
          <Card key={name}>
            <CardBody>
              <h3 className="font-semibold">{name}</h3>
              <p className="mt-2 font-display text-3xl">{price}</p>
              <p className="mt-2 text-sm text-muted">{blurb}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <Link href="/signup">
                <Button className="mt-6 w-full" variant={name === "Growth" ? "primary" : "outline"}>
                  Choose {name}
                </Button>
              </Link>
            </CardBody>
          </Card>
        ))}
      </div>
    </section>
  );
}
