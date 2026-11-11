import Link from "next/link";
import { Suspense } from "react";
import { site } from "@/config/site";
import { secondaryButtonClass } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { logoutAction } from "../login/actions";
import { AdminNav, NavLinks } from "./admin-nav";

async function CurrentAdmin() {
  const user = await requireAdmin();
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-muted">{user.email}</span>
      <form action={logoutAction}>
        <button type="submit" className={secondaryButtonClass}>
          Abmelden
        </button>
      </form>
    </div>
  );
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/admin" className="font-semibold">
            {site.name} <span className="font-normal text-muted">· Admin</span>
          </Link>
          <Suspense fallback={null}>
            <CurrentAdmin />
          </Suspense>
        </div>
        <div className="mx-auto w-full max-w-6xl px-4 pb-2">
          <Suspense fallback={<NavLinks pathname={null} />}>
            <AdminNav />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
