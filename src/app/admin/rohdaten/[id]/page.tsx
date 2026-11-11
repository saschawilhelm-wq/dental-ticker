import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { rawStatusLabels } from "@/config/taxonomy";
import { Badge, LoadingBlock, PageHeader, linkClass, secondaryButtonClass } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { getRawItem } from "@/lib/db/raw-items";
import { formatDate, formatDateTime } from "@/lib/format";
import { isUuid } from "@/lib/validation/filters";
import { rawTone } from "../../status";
import { setRawStatusAction } from "../actions";

export const metadata: Metadata = { title: "Rohdaten-Eintrag" };

async function RawItem({ params }: { params: PageProps<"/admin/rohdaten/[id]">["params"] }) {
  await requireAdmin();
  const { id } = await params;
  const item = isUuid(id) ? await getRawItem(id) : null;
  if (!item) notFound();

  return (
    <article className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={rawTone(item.status)}>{rawStatusLabels[item.status]}</Badge>
        <span className="text-muted">{item.source_name}</span>
      </div>
      <h2 className="text-xl font-semibold">{item.title}</h2>

      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
        <dt className="text-muted">Original</dt>
        <dd className="break-all">
          <a href={item.url} className={linkClass} target="_blank" rel="noopener noreferrer">{item.url}</a>
        </dd>
        <dt className="text-muted">Veröffentlicht</dt>
        <dd>{formatDateTime(item.published_at)}</dd>
        <dt className="text-muted">Abgerufen</dt>
        <dd>{formatDateTime(item.fetched_at)}</dd>
        <dt className="text-muted">GUID</dt>
        <dd className="break-all">{item.external_guid ?? "—"}</dd>
        <dt className="text-muted">Normalisierte URL</dt>
        <dd className="break-all">{item.url_normalized}</dd>
        {item.purge_after ? (
          <>
            <dt className="text-muted">Rohtext wird gelöscht am</dt>
            <dd>{formatDate(item.purge_after)}</dd>
          </>
        ) : null}
      </dl>

      <section>
        <h3 className="mb-2 font-semibold">Rohtext (nur intern, nie für Nutzer sichtbar)</h3>
        {item.raw_text ? (
          <div className="whitespace-pre-wrap rounded-lg border border-border bg-surface p-4 text-sm">{item.raw_text}</div>
        ) : (
          <p className="text-muted">Kein Rohtext vorhanden{item.source_kind === "press" ? " (bei Fachpresse nach Ablauf gelöscht)" : ""}.</p>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <form action={setRawStatusAction}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="status" value={item.status === "ignored" ? "new" : "ignored"} />
          <button type="submit" className={secondaryButtonClass}>
            {item.status === "ignored" ? "Wieder als neu markieren" : "Ignorieren"}
          </button>
        </form>
        <Link href={`/admin/rohdaten?quelle=${item.source_id}`} className={secondaryButtonClass}>
          Weitere Einträge dieser Quelle
        </Link>
      </div>
    </article>
  );
}

export default function RawItemPage(props: PageProps<"/admin/rohdaten/[id]">) {
  return (
    <>
      <PageHeader title="Rohdaten-Eintrag">
        <Link href="/admin/rohdaten" className={secondaryButtonClass}>← Zur Liste</Link>
      </PageHeader>
      <Suspense fallback={<LoadingBlock />}>
        <RawItem params={props.params} />
      </Suspense>
    </>
  );
}
