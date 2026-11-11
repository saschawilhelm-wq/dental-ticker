import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { rawStatusLabels, rawStatuses } from "@/config/taxonomy";
import { Badge, LoadingBlock, PageHeader, buttonClass, inputClass, linkClass, secondaryButtonClass } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { listRawItems } from "@/lib/db/raw-items";
import { listSources } from "@/lib/db/sources";
import { formatDateTime } from "@/lib/format";
import { parseRawItemQuery, rawItemQueryString } from "@/lib/validation/filters";
import { rawTone } from "../status";

export const metadata: Metadata = { title: "Rohdaten" };

const PAGE_SIZE = 50;

async function RawItems({ searchParams }: { searchParams: PageProps<"/admin/rohdaten">["searchParams"] }) {
  await requireAdmin();
  const query = parseRawItemQuery(await searchParams);
  const [sources, { rows, total }] = await Promise.all([
    listSources(),
    listRawItems({ ...query, pageSize: PAGE_SIZE }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilter = Boolean(query.sourceId || query.status || query.search || query.from || query.to);

  return (
    <>
      <form method="get" className="mb-6 grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="flex flex-col gap-1 lg:col-span-2">
          <label htmlFor="suche" className="text-sm font-medium">Suche im Titel</label>
          <input id="suche" name="suche" defaultValue={query.search} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="quelle" className="text-sm font-medium">Quelle</label>
          <select id="quelle" name="quelle" defaultValue={query.sourceId ?? ""} className={inputClass}>
            <option value="">Alle</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="status" className="text-sm font-medium">Status</label>
          <select id="status" name="status" defaultValue={query.status ?? ""} className={inputClass}>
            <option value="">Alle</option>
            {rawStatuses.map((s) => (
              <option key={s} value={s}>{rawStatusLabels[s]}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="von" className="text-sm font-medium">Abgerufen ab</label>
          <input id="von" name="von" type="date" defaultValue={query.from} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="bis" className="text-sm font-medium">bis</label>
          <input id="bis" name="bis" type="date" defaultValue={query.to} className={inputClass} />
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-6">
          <button type="submit" className={buttonClass}>Filtern</button>
          {hasFilter ? (
            <Link href="/admin/rohdaten" className={secondaryButtonClass}>Filter zurücksetzen</Link>
          ) : null}
        </div>
      </form>

      <p role="status" className="mb-3 text-sm text-muted">
        {total.toLocaleString("de-DE")} Einträge{pages > 1 ? ` · Seite ${query.page} von ${pages}` : ""}
      </p>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-border p-6 text-muted">
          Keine Einträge{hasFilter ? " für diesen Filter" : ". Quellen werden vom Worker abgerufen (npm run worker)"}.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-col gap-1 p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                <span className="font-medium text-foreground">{row.source_name}</span>
                <span>· veröffentlicht {formatDateTime(row.published_at)}</span>
                <span>· abgerufen {formatDateTime(row.fetched_at)}</span>
                <Badge tone={rawTone(row.status)}>{rawStatusLabels[row.status]}</Badge>
              </div>
              <Link href={`/admin/rohdaten/${row.id}`} className={`font-medium ${linkClass}`}>
                {row.title}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 ? (
        <nav aria-label="Seiten" className="mt-4 flex flex-wrap gap-2">
          {query.page > 1 ? (
            <Link href={`/admin/rohdaten${rawItemQueryString(query, { page: query.page - 1 })}`} className={secondaryButtonClass}>
              ← Neuere
            </Link>
          ) : null}
          {query.page < pages ? (
            <Link href={`/admin/rohdaten${rawItemQueryString(query, { page: query.page + 1 })}`} className={secondaryButtonClass}>
              Ältere →
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
      <PageHeader title="Rohdaten" />
      <Suspense fallback={<LoadingBlock />}>
        <RawItems searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
