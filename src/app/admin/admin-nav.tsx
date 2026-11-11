"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Übersicht" },
  { href: "/admin/quellen", label: "Quellen" },
  { href: "/admin/rohdaten", label: "Rohdaten" },
  { href: "/admin/abrufe", label: "Abrufprotokoll" },
] as const;

/** Aktueller Pfad steht erst zur Laufzeit fest; bis dahin ohne Hervorhebung. */
export function AdminNav() {
  return <NavLinks pathname={usePathname()} />;
}

export function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Admin-Bereich">
      <ul className="flex flex-wrap gap-1">
        {items.map((item) => {
          const active =
            pathname !== null && (item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-md px-3 ${
                  active ? "bg-accent font-semibold text-accent-foreground" : "hover:bg-surface"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
