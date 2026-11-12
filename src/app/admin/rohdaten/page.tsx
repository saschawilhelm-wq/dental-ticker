import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { rawStatusLabels, rawStatuses } from "@/config/taxonomy";
import {
  EmptyState,
  LoadingBlock,
  PageHeader,
  buttonClass,
  cardClass,
  inputClass,
  quietButtonClass,
  secondaryButtonClass,
} from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { listRawItems } from "@/lib/db/raw-items";
import { listSources } from "@/lib/db/sources";
import { formatDayHeading, groupByDay } from "@/lib/format";
import { parseRawItemQuery, rawItemQueryString } from "@/lib/validation/filters";
import { RawItemRow } from "../raw-item-row";

export const metadata: Metadata = { title: "Meldungen" };

const PAGE_SIZE = 50;

async function RawItems({ searchParams }: { searchParams: PageProps<"/admin/rohdaten">["searchParams"] }) {
  await requireAdmin();
  const now = new Date();
  const query = parseRawItemQuery(await searchParams);
  const [sources, { rows, total }] = await Promise.all([
    listSources(),
    listRawItems({ ...query, pageSize: PAGE_SIZE }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilter = Boolean(query.sourceId || query.status || query.search || query.from || query.to);
  const groups = groupByDay(rows, (row) => new Date(row.published_at ?? row.fetched_at));

  return (
    <>
      <form method="get" role="search" className={`${cardClass} mb-8 flex flex-col gap-4 p-4 sm:p-5`}>
        <div className="flex gap-2 sm:gap-3">
          <div className="relative flex-1">
            <label htmlFor="suche" className="sr-only">Suche im Titel</label>
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-subtle" />
            <input id="suche" name="suche" defaultValue={query.search} placeholder="z. B. ePA oder Festzuschuss" className={`${inputClass} pl-10`} />
          </div>
          <button type="submit" className={buttonClass}>
            <Search aria-hidden="true" className="size-4 sm:hidden" />
            <span className="sr-only sm:not-sr-only">Suchen</span>
          </button>
        </div>
        <details open={Boolean(query.sourceId || query.status || query.from || query.to)} className="group">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 text-[0.95rem] font-medium text-muted hover:text-foreground">
            <SlidersHorizontal aria-hidden="true" className="size-4" />
            Weitere Filter
            <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open:rotate-180" />
          </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="quelle" className="text-sm text-muted">Quelle</label>
            <select id="quelle" name="quelle" defaultValue={query.sourceId ?? ""} className={inputClass}>
              <option value="">Alle Quellen</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="status" className="text-sm text-muted">Status</label>
            <select id="status" name="status" defaultValue={query.status ?? ""} className={inputClass}>
              <option value="">Alle</option>
              {rawStatuses.map((s) => (
                <option key={s} value={s}>{rawStatusLabels[s]}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="von" className="text-sm text-muted">Veröffentlicht ab</label>
            <input id="von" name="von" type="date" defaultValue={query.from} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="bis" className="text-sm text-muted">bis</label>
            <input id="bis" name="bis" type="date" defaultValue={query.to} className={inputClass} />
          </div>
        </div>
        </details>
      </form>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p role="status" className="text-sm text-muted">
          {total.toLocaleString("de-DE")} Einträge{pages > 1 ? ` · Seite ${query.page} von ${pages}` : ""}
        </p>
        {hasFilter ? (
          <Link href="/admin/rohdaten" className={quietButtonClass}>
            <X aria-hidden="true" className="size-4" />
            Filter zurücksetzen
          </Link>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <EmptyState>
          Keine Einträge{hasFilter ? " für diesen Filter" : ". Quellen werden vom Worker abgerufen (npm run worker)"}.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-10">
          {groups.map((group) => (
            <section key={group.key} aria-labelledby={`tag-${group.key}`}>
              <h2 id={`tag-${group.key}`} className="mb-3 flex items-baseline gap-3 font-serif text-xl font-semibold">
                {formatDayHeading(group.date, now)}
                <span className="font-sans text-sm font-normal text-muted">
                  {group.items.length === 1 ? "1 Meldung" : `${group.items.length} Meldungen`}
                </span>
              </h2>
              <div className={`${cardClass} divide-y divide-border overflow-hidden`}>
                {group.items.map((row) => (
                  <RawItemRow key={row.id} item={row} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {pages > 1 ? (
        <nav aria-label="Seiten" className="mt-8 flex flex-wrap justify-between gap-2">
          {query.page > 1 ? (
            <Link href={`/admin/rohdaten${rawItemQueryString(query, { page: query.page - 1 })}`} className={secondaryButtonClass}>
              <ArrowLeft aria-hidden="true" className="size-4" /> Neuere
            </Link>
          ) : <span />}
          {query.page < pages ? (
            <Link href={`/admin/rohdaten${rawItemQueryString(query, { page: query.page + 1 })}`} className={secondaryButtonClass}>
              Ältere <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}

export default function RawItemsPage(props: PageProps<"/admin/rohdaten">) {
  return (
    <>
      <PageHeader
        eyebrow="Rohdaten aus den Quellen"
        title="Meldungen"
        description="Alles, was die Quellen geliefert haben, noch ungefiltert. Auswahl und Zusammenfassung übernimmt ab Phase 2 die KI."
      />
      <Suspense fallback={<LoadingBlock />}>
        <RawItems searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
