import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function CTA() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <div className="rounded-lg bg-slate-900 px-8 py-12 text-white dark:bg-indigo-950">
        <h2 className="font-display text-3xl font-semibold">Start from the foundation, not from zero.</h2>
        <p className="mt-3 max-w-2xl text-slate-300">Create an account, verify email, and open the dashboard shell.</p>
        <Link href="/signup">
          <Button className="mt-6 bg-white text-slate-900 hover:bg-slate-100">Get started</Button>
        </Link>
      </div>
    </section>
  );
}
