import Link from "next/link";
import { rawStatusLabels } from "@/config/taxonomy";
import { Badge, SourceMark } from "@/components/ui";
import type { RawItemListRow } from "@/lib/db/raw-items";
import { formatTime } from "@/lib/format";
import { rawTone } from "./status";

/** Eine Meldung in Listen: Quelle, Uhrzeit, Titel und ein kurzer Anriss. */
export function RawItemRow({ item, showTeaser = true }: { item: RawItemListRow; showTeaser?: boolean }) {
  const when = item.published_at ?? item.fetched_at;
  return (
    <article className="group relative flex gap-4 px-4 py-5 transition-colors hover:bg-surface-muted/60 sm:px-6">
      <SourceMark name={item.source_name} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          <span className="font-medium text-foreground">{item.source_name}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={new Date(when).toISOString()}>
            {formatTime(when)} Uhr{item.published_at ? "" : " (Abruf)"}
          </time>
          {item.status !== "new" ? <Badge tone={rawTone(item.status)}>{rawStatusLabels[item.status]}</Badge> : null}
        </p>
        <h3 className="mt-1 font-serif text-[1.15rem] font-semibold leading-snug">
          {/* Die ganze Zeile ist klickbar; der Link liegt auf dem Titel. */}
          <Link href={`/admin/rohdaten/${item.id}`} className="after:absolute after:inset-0 group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
            {item.title}
          </Link>
        </h3>
        {showTeaser && item.teaser ? (
          <p className="mt-1.5 line-clamp-2 max-w-[70ch] text-[0.95rem] text-muted">{item.teaser}</p>
        ) : null}
      </div>
    </article>
  );
}
