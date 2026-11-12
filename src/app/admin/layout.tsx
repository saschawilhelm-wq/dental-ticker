import Link from "next/link";
import { Suspense } from "react";
import { LogOut } from "lucide-react";
import { site } from "@/config/site";
import { quietButtonClass } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { logoutAction } from "../login/actions";
import { AdminNav, NavLinks } from "./admin-nav";

async function CurrentAdmin() {
  const user = await requireAdmin();
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="hidden text-muted sm:inline">{user.email}</span>
      <form action={logoutAction}>
        <button type="submit" className={quietButtonClass}>
          <LogOut aria-hidden="true" className="size-4" />
          <span className="sr-only sm:not-sr-only">Abmelden</span>
        </button>
      </form>
    </div>
  );
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 pt-3 sm:px-6">
          <Link href="/admin" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- statisches SVG ohne Optimierungsbedarf */}
            <img src="/icon.svg" alt="" className="size-8" />
            <span className="font-serif text-lg font-semibold whitespace-nowrap">{site.name}</span>
            <span className="hidden rounded-md bg-surface-muted px-1.5 py-0.5 text-xs font-medium text-muted sm:inline">Redaktion</span>
          </Link>
          <Suspense fallback={null}>
            <CurrentAdmin />
          </Suspense>
        </div>
        <div className="mx-auto w-full max-w-6xl px-2 sm:px-4">
          <Suspense fallback={<NavLinks pathname={null} />}>
            <AdminNav />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}
