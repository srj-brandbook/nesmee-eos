"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { navItems, settingsNav, titleForPath } from "@/config/nav";

function crumbLabel(href, part) {
  const items = [...navItems, ...settingsNav];
  const exact = items.find((item) => item.href === href);
  if (exact) return exact.label;
  if (/^[0-9a-f]{24}$/i.test(part) || /^[0-9a-f-]{8,}$/i.test(part)) return "Details";
  return part.replace(/-/g, " ");
}

export function PageTitle({ className }) {
  const pathname = usePathname();
  return <h1 className={className}>{titleForPath(pathname)}</h1>;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  if (!parts.length) return null;

  return (
    <nav aria-label="Breadcrumb" className="min-w-0 overflow-hidden py-1.5 md:py-2">
      <ol className="flex min-w-0 max-w-full items-center gap-1 overflow-x-auto whitespace-nowrap text-[11px] leading-none text-muted [scrollbar-width:none] md:text-xs [&::-webkit-scrollbar]:hidden">
        <li className="shrink-0">
          <Link href="/dashboard" className="transition hover:text-text">
            App
          </Link>
        </li>
        {parts.map((part, index) => {
          const href = `/${parts.slice(0, index + 1).join("/")}`;
          const last = index === parts.length - 1;
          return (
            <li key={href} className="flex min-w-0 shrink items-center gap-1">
              <ChevronRight className="h-3 w-3 shrink-0 opacity-50" aria-hidden />
              {last ? (
                <span className="truncate font-medium capitalize text-text" aria-current="page">
                  {crumbLabel(href, part)}
                </span>
              ) : (
                <Link href={href} className="shrink-0 capitalize transition hover:text-text">
                  {crumbLabel(href, part)}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
