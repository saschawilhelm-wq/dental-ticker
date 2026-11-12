import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, EyeOff, ExternalLink, RotateCcw } from "lucide-react";
import { rawStatusLabels } from "@/config/taxonomy";
import { Badge, LoadingBlock, SourceMark, cardClass, linkClass, quietButtonClass, secondaryButtonClass } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { getRawItem } from "@/lib/db/raw-items";
import { formatDate, formatDateTime, formatLongDate, hostOf } from "@/lib/format";
import { isUuid } from "@/lib/validation/filters";
import { rawTone } from "../../status";
import { setRawStatusAction } from "../actions";

export const metadata: Metadata = { title: "Meldung" };

async function RawItem({ params }: { params: PageProps<"/admin/rohdaten/[id]">["params"] }) {
  await requireAdmin();
  const { id } = await params;
  const item = isUuid(id) ? await getRawItem(id) : null;
  if (!item) notFound();
  const paragraphs = item.raw_text?.split(/\n{1,}/).filter((p) => p.trim()) ?? [];

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <article className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <SourceMark name={item.source_name} />
          <div>
            <p className="font-medium">{item.source_name}</p>
            <p className="text-sm text-muted">
              {item.published_at ? formatLongDate(new Date(item.published_at)) : "ohne Veröffentlichungsdatum"}
            </p>
          </div>
        </div>
        <h1 className="max-w-[30ch] font-serif text-[2rem] font-semibold leading-tight tracking-tight sm:text-[2.3rem]">
          {item.title}
        </h1>

        <div className="mt-8 max-w-[68ch]">
          <p className="mb-3 text-sm font-medium text-muted">Rohtext der Quelle · nur intern, nie für Nutzer sichtbar</p>
          {paragraphs.length > 0 ? (
            <div className="flex flex-col gap-4 border-l-2 border-border-strong pl-5 text-[1.05rem] leading-relaxed">
              {paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          ) : (
            <p className="text-muted">
              Kein Rohtext vorhanden{item.source_kind === "press" ? " (bei Fachpresse nach Ablauf gelöscht)" : ""}.
            </p>
          )}
        </div>

        <p className="mt-8">
          <a href={item.url} target="_blank" rel="noopener noreferrer" className={secondaryButtonClass}>
            Original bei {hostOf(item.url)} öffnen
            <ExternalLink aria-hidden="true" className="size-4" />
          </a>
        </p>
      </article>

      <aside className="flex flex-col gap-4 lg:pt-2">
        <div className={`${cardClass} p-5`}>
          <h2 className="mb-3 text-sm font-semibold text-muted">Status</h2>
          <Badge tone={rawTone(item.status)}>{rawStatusLabels[item.status]}</Badge>
          <form action={setRawStatusAction} className="mt-4">
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="status" value={item.status === "ignored" ? "new" : "ignored"} />
            <button type="submit" className={`${secondaryButtonClass} w-full`}>
              {item.status === "ignored" ? (
                <>
                  <RotateCcw aria-hidden="true" className="size-4" /> Wieder als neu markieren
                </>
              ) : (
                <>
                  <EyeOff aria-hidden="true" className="size-4" /> Ignorieren
                </>
              )}
            </button>
          </form>
        </div>

        <dl className={`${cardClass} flex flex-col gap-3 p-5 text-sm`}>
          <div>
            <dt className="text-muted">Veröffentlicht</dt>
            <dd>{formatDateTime(item.published_at)}</dd>
          </div>
          <div>
            <dt className="text-muted">Abgerufen</dt>
            <dd>{formatDateTime(item.fetched_at)}</dd>
          </div>
          {item.purge_after ? (
            <div>
              <dt className="text-muted">Rohtext wird gelöscht am</dt>
              <dd>{formatDate(item.purge_after)}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-muted">Kennung in der Quelle</dt>
            <dd className="break-all">{item.external_guid ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Adresse (normalisiert)</dt>
            <dd className="break-all text-muted">{item.url_normalized}</dd>
          </div>
        </dl>

        <Link href={`/admin/rohdaten?quelle=${item.source_id}`} className={`text-sm ${linkClass}`}>
          Weitere Meldungen von {item.source_name}
        </Link>
      </aside>
    </div>
  );
}

export default function RawItemPage(props: PageProps<"/admin/rohdaten/[id]">) {
  return (
    <>
      <p className="mb-6">
        <Link href="/admin/rohdaten" className={`${quietButtonClass} -ml-3`}>
          <ArrowLeft aria-hidden="true" className="size-4" /> Alle Meldungen
        </Link>
      </p>
      <Suspense fallback={<LoadingBlock />}>
        <RawItem params={props.params} />
      </Suspense>
    </>
  );
}
