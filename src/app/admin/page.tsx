import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { fetchRunStatusLabels } from "@/config/taxonomy";
import { Badge, LoadingBlock, PageHeader, linkClass } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { listFetchRuns } from "@/lib/db/fetch-runs";
import { getOverview } from "@/lib/db/raw-items";
import { formatDateTime } from "@/lib/format";
import { runTone } from "./status";

export const metadata: Metadata = { title: "Übersicht" };

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="rounded-lg border border-border p-4 hover:bg-surface">
      <p className="text-sm text-muted">{label}</p>
      <p className="text-3xl font-semibold tabular-nums">{value.toLocaleString("de-DE")}</p>
    </Link>
  );
}

async function Overview() {
  await requireAdmin();
  const [overview, problems] = await Promise.all([
    getOverview(),
    listFetchRuns({ onlyProblems: true, limit: 5 }),
  ]);
  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Aktive Quellen" value={overview.sources_active} href="/admin/quellen" />
        <Stat label="Neue Einträge heute" value={overview.items_today} href="/admin/rohdaten" />
        <Stat label="Einträge gesamt" value={overview.items_total} href="/admin/rohdaten" />
        <Stat label="Abrufe (24 Std.)" value={overview.runs_last_24h} href="/admin/abrufe" />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Probleme</h2>
        {overview.sources_failing === 0 && overview.errors_last_24h === 0 ? (
          <p>
            <Badge tone="ok">Keine Fehler in den letzten 24 Stunden</Badge>
          </p>
        ) : (
          <p className="mb-3">
            <Badge tone="error">
              {overview.sources_failing} Quelle(n) mit Fehlern, {overview.errors_last_24h} Fehlversuch(e) in 24 Std.
            </Badge>
          </p>
        )}
        {problems.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {problems.map((run) => (
              <li key={run.id} className="flex flex-wrap items-center gap-2 text-sm">
                <Badge tone={runTone(run.status)}>{fetchRunStatusLabels[run.status]}</Badge>
                <span className="font-medium">{run.source_name}</span>
                <span className="text-muted">{formatDateTime(run.started_at)}</span>
                {run.error ? <span className="text-muted">— {run.error}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-3 text-sm">
          <Link href="/admin/abrufe?nur=probleme" className={linkClass}>
            Alle Probleme im Abrufprotokoll
          </Link>
        </p>
      </section>
    </div>
  );
}

export default function AdminHomePage() {
  return (
    <>
      <PageHeader title="Übersicht" />
      <Suspense fallback={<LoadingBlock />}>
        <Overview />
      </Suspense>
    </>
  );
}
