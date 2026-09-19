import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { appTagline } from "@/config/env";

export function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 md:py-28">
      <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-primary">{appTagline}</p>
      <h1 className="max-w-3xl font-display text-4xl font-semibold leading-tight md:text-6xl">
        Run export from one operating system.
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-muted">
        Markets, corridors, landed cost, documents, and billing—wired together so your team quotes, ships, and collects without switching tools.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/signup">
          <Button size="lg">Create an account</Button>
        </Link>
        <Link href="/login">
          <Button size="lg" variant="outline">
            Open the workspace
          </Button>
        </Link>
      </div>
    </section>
  );
}
