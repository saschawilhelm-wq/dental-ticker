import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ExternalLink, Newspaper, Pencil, Plus, Power, PowerOff } from "lucide-react";
import { countryLabels, fetchMethodLabels, sourceKindLabels } from "@/config/taxonomy";
import { LoadingBlock, Notice, PageHeader, SourceMark, buttonClass, cardClass, linkClass, quietButtonClass } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { listSources } from "@/lib/db/sources";
import { formatInterval, formatRelative, hostOf } from "@/lib/format";
import { SourceState } from "../source-state";
import { toggleSourceAction } from "./actions";
import { FetchNowButton } from "./fetch-now-button";

export const metadata: Metadata = { title: "Quellen" };

function Fact({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}

async function SourceList({ searchParams }: { searchParams: PageProps<"/admin/quellen">["searchParams"] }) {
  await requireAdmin();
  const now = new Date();
  const [sources, params] = await Promise.all([listSources(), searchParams]);
  const savedId = typeof params.gespeichert === "string" ? params.gespeichert : null;
  const saved = sources.find((s) => s.id === savedId);

  return (
    <>
      {saved ? (
        <div className="mb-6">
          <Notice tone="ok">„{saved.name}“ gespeichert.</Notice>
        </div>
      ) : null}
      <ul className="grid gap-5 lg:grid-cols-2">
        {sources.map((source) => (
          <li key={source.id} className={`${cardClass} flex flex-col p-5 sm:p-6 ${source.is_active ? "" : "opacity-80"}`}>
            <div className="flex items-start gap-4">
              <SourceMark name={source.name} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="font-serif text-xl font-semibold leading-snug">{source.name}</h2>
                  <SourceState source={source} />
                </div>
                <p className="mt-1 text-sm text-muted">
                  {sourceKindLabels[source.kind]} · Stufe {source.trust_level} · {countryLabels[source.country]}
                </p>
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-border py-4 sm:grid-cols-4">
              <Fact label="Abruf" value={`alle ${formatInterval(source.fetch_interval_min)}`} />
              <Fact label="Zuletzt erfolgreich" value={formatRelative(source.last_success_at, now)} />
              <Fact label="Neu (7 Tage)" value={source.items_last_7d} />
              <Fact label="Gesamt" value={source.item_count} />
            </dl>

            <div className="mt-4 flex flex-col gap-2 text-sm">
              <p className="flex flex-wrap items-center gap-x-2 text-muted">
                {fetchMethodLabels[source.fetch_method]}:
                {source.feed_url ? (
                  <a href={source.feed_url} className={`inline-flex items-center gap-1 ${linkClass}`} target="_blank" rel="noopener noreferrer">
                    {hostOf(source.feed_url)}
                    <ExternalLink aria-hidden="true" className="size-3.5" />
                  </a>
                ) : (
                  <span>kein Feed hinterlegt</span>
                )}
              </p>
              {source.terms_note ? <p className="max-w-[65ch] text-muted">{source.terms_note}</p> : null}
            </div>

            <div className="mt-auto flex flex-wrap items-start gap-1 pt-5">
              <FetchNowButton sourceId={source.id} disabled={source.fetch_method !== "rss" || !source.feed_url} />
              <Link href={`/admin/rohdaten?quelle=${source.id}`} className={quietButtonClass}>
                <Newspaper aria-hidden="true" className="size-4" /> Meldungen
              </Link>
              <Link href={`/admin/quellen/${source.id}`} className={quietButtonClass}>
                <Pencil aria-hidden="true" className="size-4" /> Bearbeiten
              </Link>
              <form action={toggleSourceAction}>
                <input type="hidden" name="id" value={source.id} />
                <input type="hidden" name="active" value={source.is_active ? "false" : "true"} />
                <button type="submit" className={quietButtonClass}>
                  {source.is_active ? (
                    <>
                      <PowerOff aria-hidden="true" className="size-4" /> Deaktivieren
                    </>
                  ) : (
                    <>
                      <Power aria-hidden="true" className="size-4" /> Aktivieren
                    </>
                  )}
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
      <PageHeader
        eyebrow="Woher die Meldungen kommen"
        title="Quellen"
        description="Primärquellen werden alle 30 Minuten abgerufen. Vor jedem Abruf wird geprüft, ob die Website ihn erlaubt."
      >
        <Link href="/admin/quellen/neu" className={buttonClass}>
          <Plus aria-hidden="true" className="size-4" /> Quelle hinzufügen
        </Link>
      </PageHeader>
      <Suspense fallback={<LoadingBlock />}>
        <SourceList searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
