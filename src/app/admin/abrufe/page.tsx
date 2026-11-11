import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { fetchRunStatusLabels } from "@/config/taxonomy";
import { Badge, LoadingBlock, PageHeader, secondaryButtonClass } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { listFetchRuns } from "@/lib/db/fetch-runs";
import { listSources } from "@/lib/db/sources";
import { formatDateTime, formatDuration } from "@/lib/format";
import { parseRunQuery } from "@/lib/validation/filters";
import { runTone } from "../status";

export const metadata: Metadata = { title: "Abrufprotokoll" };

async function Runs({ searchParams }: { searchParams: PageProps<"/admin/abrufe">["searchParams"] }) {
  await requireAdmin();
  const query = parseRunQuery(await searchParams);
  const [runs, sources] = await Promise.all([listFetchRuns({ ...query, limit: 200 }), listSources()]);
  const sourceName = sources.find((s) => s.id === query.sourceId)?.name;

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/abrufe" aria-current={!query.onlyProblems && !query.sourceId ? "page" : undefined} className={secondaryButtonClass}>
          Alle
        </Link>
        <Link href="/admin/abrufe?nur=probleme" aria-current={query.onlyProblems ? "page" : undefined} className={secondaryButtonClass}>
          Nur Probleme
        </Link>
      </div>
      {sourceName ? <p className="mb-3 text-sm text-muted">Gefiltert auf: {sourceName}</p> : null}
      {runs.length === 0 ? (
        <p className="rounded-lg border border-border p-6 text-muted">Noch keine Abrufe protokolliert.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">Die letzten 200 Abrufe</caption>
            <thead className="bg-surface">
              <tr>
                <th scope="col" className="p-3">Zeitpunkt</th>
                <th scope="col" className="p-3">Quelle</th>
                <th scope="col" className="p-3">Ergebnis</th>
                <th scope="col" className="p-3 text-right">Gesehen</th>
                <th scope="col" className="p-3 text-right">Neu</th>
                <th scope="col" className="p-3">Dauer</th>
                <th scope="col" className="p-3">Hinweis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {runs.map((run) => (
                <tr key={run.id}>
                  <td className="whitespace-nowrap p-3">{formatDateTime(run.started_at)}</td>
                  <td className="p-3">
                    <Link href={`/admin/abrufe?quelle=${run.source_id}`} className="underline-offset-2 hover:underline">
                      {run.source_name}
                    </Link>
                  </td>
                  <td className="p-3">
                    <Badge tone={runTone(run.status)}>
                      {fetchRunStatusLabels[run.status]}
                      {run.http_status ? ` (${run.http_status})` : ""}
                    </Badge>
                  </td>
                  <td className="p-3 text-right tabular-nums">{run.items_seen}</td>
                  <td className="p-3 text-right tabular-nums">{run.items_new}</td>
                  <td className="whitespace-nowrap p-3">{formatDuration(run.started_at, run.finished_at)}</td>
                  <td className="p-3 text-muted">{run.error ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function RunsPage(props: PageProps<"/admin/abrufe">) {
  return (
    <>
      <PageHeader title="Abrufprotokoll" />
      <Suspense fallback={<LoadingBlock />}>
        <Runs searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
