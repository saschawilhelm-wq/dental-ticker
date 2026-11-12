import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { fetchRunStatusLabels } from "@/config/taxonomy";
import { Badge, EmptyState, LoadingBlock, PageHeader, cardClass } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { listFetchRuns } from "@/lib/db/fetch-runs";
import { listSources } from "@/lib/db/sources";
import { formatDayHeading, formatDuration, formatTime, groupByDay } from "@/lib/format";
import { parseRunQuery } from "@/lib/validation/filters";
import { runTone } from "../status";

export const metadata: Metadata = { title: "Abrufprotokoll" };

function FilterTab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-11 items-center rounded-full px-4 text-[0.95rem] ${
        active ? "bg-accent font-medium text-accent-foreground" : "border border-border-strong bg-surface hover:bg-surface-muted"
      }`}
    >
      {children}
    </Link>
  );
}

async function Runs({ searchParams }: { searchParams: PageProps<"/admin/abrufe">["searchParams"] }) {
  await requireAdmin();
  const now = new Date();
  const query = parseRunQuery(await searchParams);
  const [runs, sources] = await Promise.all([listFetchRuns({ ...query, limit: 200 }), listSources()]);
  const sourceName = sources.find((s) => s.id === query.sourceId)?.name;
  const groups = groupByDay(runs, (run) => new Date(run.started_at));

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <FilterTab href="/admin/abrufe" active={!query.onlyProblems && !query.sourceId}>Alle</FilterTab>
        <FilterTab href="/admin/abrufe?nur=probleme" active={query.onlyProblems}>Nur Probleme</FilterTab>
        {sourceName ? <span className="text-sm text-muted">Gefiltert auf: {sourceName}</span> : null}
      </div>
      {runs.length === 0 ? (
        <EmptyState>{query.onlyProblems ? "Keine Probleme protokolliert." : "Noch keine Abrufe protokolliert."}</EmptyState>
      ) : (
        <div className="flex flex-col gap-10">
          {groups.map((group) => (
            <section key={group.key} aria-labelledby={`lauf-${group.key}`}>
              <h2 id={`lauf-${group.key}`} className="mb-3 font-serif text-xl font-semibold">
                {formatDayHeading(group.date, now)}
              </h2>
              <ul className={`${cardClass} divide-y divide-border`}>
                {group.items.map((run) => (
                  <li key={run.id} className="grid gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[4rem_minmax(0,14rem)_minmax(0,1fr)_auto] sm:items-center sm:px-6">
                    <span className="text-sm tabular-nums text-muted">{formatTime(run.started_at)}</span>
                    <Link href={`/admin/abrufe?quelle=${run.source_id}`} className="truncate font-medium hover:underline">
                      {run.source_name}
                    </Link>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <Badge tone={runTone(run.status)}>
                        {fetchRunStatusLabels[run.status]}
                        {run.http_status ? ` (${run.http_status})` : ""}
                      </Badge>
                      {run.status === "ok" ? (
                        <span className="text-muted">
                          {run.items_new > 0 ? <strong className="font-semibold text-foreground">{run.items_new} neu</strong> : "nichts Neues"} · {run.items_seen} gesehen
                        </span>
                      ) : null}
                      {run.error ? <span className="text-muted">{run.error}</span> : null}
                    </span>
                    <span className="text-sm tabular-nums text-subtle sm:text-right">{formatDuration(run.started_at, run.finished_at)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

export default function RunsPage(props: PageProps<"/admin/abrufe">) {
  return (
    <>
      <PageHeader
        eyebrow="Technik"
        title="Abrufprotokoll"
        description="Jeder Abruf einer Quelle, mit Ergebnis. Die letzten 200 Einträge."
      />
      <Suspense fallback={<LoadingBlock />}>
        <Runs searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
