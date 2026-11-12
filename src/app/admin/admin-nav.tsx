"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, LayoutDashboard, Newspaper, Rss, type LucideIcon } from "lucide-react";

const items: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "Übersicht", icon: LayoutDashboard },
  { href: "/admin/rohdaten", label: "Meldungen", icon: Newspaper },
  { href: "/admin/quellen", label: "Quellen", icon: Rss },
  { href: "/admin/abrufe", label: "Abrufprotokoll", icon: History },
];

/** Aktueller Pfad steht erst zur Laufzeit fest; bis dahin ohne Hervorhebung. */
export function AdminNav() {
  return <NavLinks pathname={usePathname()} />;
}

export function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Admin-Bereich" className="-mb-px overflow-x-auto">
      <ul className="flex gap-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname !== null && (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-12 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-[0.95rem] transition-colors duration-300 ${
                  active
                    ? "border-accent font-semibold text-foreground"
                    : "border-transparent text-muted hover:border-border-strong hover:text-foreground"
                }`}
              >
                <Icon aria-hidden="true" className="size-4" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
