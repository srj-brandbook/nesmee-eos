import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 md:py-28">
      <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-primary">Reusable SaaS foundation</p>
      <h1 className="max-w-3xl font-display text-4xl font-semibold leading-tight md:text-6xl">
        Ship the next product on a secure, permission-aware core.
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-muted">
        Authentication, RBAC, users, audit logs, and a dashboard shell—already wired. Add your business module and go.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/signup">
          <Button size="lg">Create an account</Button>
        </Link>
        <Link href="/login">
          <Button size="lg" variant="outline">
            View the dashboard
          </Button>
        </Link>
      </div>
    </section>
  );
}
