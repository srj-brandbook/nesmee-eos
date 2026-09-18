"use client";

import { Button } from "@/components/ui/Button";

export default function ErrorPage({ reset }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-display text-3xl font-semibold">Something went wrong</h1>
      <p className="text-muted">An unexpected error occurred. Try again.</p>
      <Button onClick={() => reset()}>Retry</Button>
    </div>
  );
}
