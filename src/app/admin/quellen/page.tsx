import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { countryLabels, fetchMethodLabels, sourceKindLabels } from "@/config/taxonomy";
import { Badge, LoadingBlock, PageHeader, buttonClass, linkClass, secondaryButtonClass } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { listSources, type SourceWithStats } from "@/lib/db/sources";
import { formatDateTime, formatInterval, hostOf } from "@/lib/format";
import { toggleSourceAction } from "./actions";
import { FetchNowButton } from "./fetch-now-button";

export const metadata: Metadata = { title: "Quellen" };

function SourceState({ source }: { source: SourceWithStats }) {
  if (!source.is_active) return <Badge tone="neutral">Inaktiv</Badge>;
  if (source.robots_allowed === false) return <Badge tone="warn">robots.txt sperrt</Badge>;
  if (source.consecutive_failures > 0) {
    return <Badge tone="error">{source.consecutive_failures} Fehler in Folge</Badge>;
  }
  if (!source.last_success_at) return <Badge tone="neutral">Noch nicht abgerufen</Badge>;
  return <Badge tone="ok">In Ordnung</Badge>;
}

async function SourceList({ searchParams }: { searchParams: PageProps<"/admin/quellen">["searchParams"] }) {
  await requireAdmin();
  const [sources, params] = await Promise.all([listSources(), searchParams]);
  const savedId = typeof params.gespeichert === "string" ? params.gespeichert : null;
  const saved = sources.find((s) => s.id === savedId);

  return (
    <>
      {saved ? (
        <p role="status" className="mb-4 rounded-md bg-ok-bg p-3 text-ok">
          <span aria-hidden="true">✓ </span>„{saved.name}“ gespeichert.
        </p>
      ) : null}
      <ul className="flex flex-col gap-4">
        {sources.map((source) => (
          <li key={source.id} className="rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">{source.name}</h2>
                <p className="text-sm text-muted">
                  {sourceKindLabels[source.kind]} · Stufe {source.trust_level} · {countryLabels[source.country]} ·{" "}
                  {fetchMethodLabels[source.fetch_method]} alle {formatInterval(source.fetch_interval_min)}
                </p>
                <p className="mt-1 break-all text-sm">
                  {source.feed_url ? (
                    <a href={source.feed_url} className={linkClass} target="_blank" rel="noopener noreferrer">
                      {hostOf(source.feed_url)}
                    </a>
                  ) : (
                    <span className="text-muted">Kein Feed hinterlegt</span>
                  )}
                </p>
              </div>
              <SourceState source={source} />
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-muted">Letzter Erfolg</dt>
                <dd>{formatDateTime(source.last_success_at)}</dd>
              </div>
              <div>
                <dt className="text-muted">Letzter Versuch</dt>
                <dd>{formatDateTime(source.last_fetched_at)}</dd>
              </div>
              <div>
                <dt className="text-muted">Einträge (7 Tage)</dt>
                <dd className="tabular-nums">{source.items_last_7d}</dd>
              </div>
              <div>
                <dt className="text-muted">Einträge gesamt</dt>
                <dd className="tabular-nums">{source.item_count}</dd>
              </div>
            </dl>
            {source.terms_note ? <p className="mt-3 text-sm text-muted">{source.terms_note}</p> : null}

            <div className="mt-4 flex flex-wrap items-start gap-2">
              <FetchNowButton sourceId={source.id} disabled={source.fetch_method !== "rss" || !source.feed_url} />
              <Link href={`/admin/quellen/${source.id}`} className={secondaryButtonClass}>
                Bearbeiten
              </Link>
              <Link href={`/admin/rohdaten?quelle=${source.id}`} className={secondaryButtonClass}>
                Rohdaten
              </Link>
              <form action={toggleSourceAction}>
                <input type="hidden" name="id" value={source.id} />
                <input type="hidden" name="active" value={source.is_active ? "false" : "true"} />
                <button type="submit" className={secondaryButtonClass}>
                  {source.is_active ? "Deaktivieren" : "Aktivieren"}
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function SourcesPage(props: PageProps<"/admin/quellen">) {
  return (
    <>
      <PageHeader title="Quellen">
        <Link href="/admin/quellen/neu" className={buttonClass}>
          Quelle hinzufügen
        </Link>
      </PageHeader>
      <Suspense fallback={<LoadingBlock />}>
        <SourceList searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
