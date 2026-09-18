import Link from "next/link";
import { appName } from "@/config/env";

export default function AuthLayout({ children }) {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-slate-900 p-10 text-white md:flex">
        <Link href="/" className="font-display text-xl font-semibold">
          {appName}
        </Link>
        <div>
          <p className="font-display text-3xl font-semibold">A calm place to start the next product.</p>
          <p className="mt-3 max-w-sm text-slate-300">Sessions stay in HTTP-only cookies. Permissions live in the database.</p>
        </div>
        <p className="text-sm text-slate-400">JavaScript · Next.js · Express · MongoDB</p>
      </div>
      <div className="flex items-center justify-center p-6">{children}</div>
    </div>
  );
}
