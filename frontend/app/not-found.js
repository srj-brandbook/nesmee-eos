import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-display text-3xl font-semibold">Page not found</h1>
      <p className="text-muted">The page you requested does not exist.</p>
      <Link href="/">
        <Button>Back home</Button>
      </Link>
    </div>
  );
}
