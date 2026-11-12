import Link from "next/link";
import { CalendarClock, CircleAlert, Layers, ShieldCheck } from "lucide-react";
import { actionLevelLabels, categoryLabels, storyStatusLabels } from "@/config/taxonomy";
import { Badge, SourceMark } from "@/components/ui";
import type { StoryListRow } from "@/lib/db/stories";
import { formatDate } from "@/lib/format";
import { importanceBand } from "@/lib/scoring/score";
import { actionTone, storyTone } from "./status";

const bandLabel = { hoch: "Hoch", mittel: "Mittel", niedrig: "Niedrig" } as const;

/** Wichtigkeit als Zahl mit Worten — nie nur über Farbe. */
export function ImportanceMark({ value }: { value: number | null }) {
  if (value === null) return <span className="text-sm text-muted">—</span>;
  const band = importanceBand(value);
  return (
    <span className="flex flex-col items-center leading-none" title={`Wichtigkeit ${value} von 100`}>
      <span className="font-serif text-2xl font-semibold tabular-nums">{value}</span>
      <span className="mt-1 text-[0.7rem] font-medium tracking-wide text-muted uppercase">{bandLabel[band]}</span>
    </span>
  );
}

export function StoryCard({ story, showStatus = true }: { story: StoryListRow; showStatus?: boolean }) {
  return (
    <article className="group relative flex gap-4 px-4 py-6 transition-colors duration-300 hover:bg-surface-muted sm:gap-6 sm:px-7">
      <div className="flex w-12 shrink-0 flex-col items-center gap-3 pt-1">
        <ImportanceMark value={story.importance} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-muted">
          {story.category ? <span className="font-medium text-foreground">{categoryLabels[story.category]}</span> : null}
          {story.handlungsbedarf && story.handlungsbedarf !== "keiner" ? (
            <Badge tone={actionTone(story.handlungsbedarf)}>{actionLevelLabels[story.handlungsbedarf]}</Badge>
          ) : null}
          {story.frist ? (
            <span className="inline-flex items-center gap-1">
              <CalendarClock aria-hidden="true" className="size-4" /> Frist {formatDate(story.frist)}
            </span>
          ) : null}
          {showStatus ? <Badge tone={storyTone(story.status)}>{storyStatusLabels[story.status]}</Badge> : null}
        </p>
        <h3 className="mt-1.5 font-serif text-[1.2rem] font-semibold leading-snug">
          <Link
            href={`/admin/ticker/${story.id}`}
            className="after:absolute after:inset-0 group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4"
          >
            {story.headline ?? "(ohne Überschrift)"}
          </Link>
        </h3>
        {story.summary ? <p className="mt-2 line-clamp-2 max-w-[68ch] text-[0.95rem] leading-relaxed text-muted">{story.summary}</p> : null}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
          <span className="inline-flex items-center gap-2">
            <SourceMark name={story.source_name} size="sm" />
            {story.source_name}
          </span>
          {story.source_count > 1 ? (
            <span className="inline-flex items-center gap-1">
              <Layers aria-hidden="true" className="size-4" /> {story.source_count} Quellen
            </span>
          ) : null}
          {story.ai_checked ? (
            <span className="inline-flex items-center gap-1">
              <ShieldCheck aria-hidden="true" className="size-4" /> KI-geprüft
            </span>
          ) : null}
          {story.issue_count > 0 ? (
            <span className="inline-flex items-center gap-1 text-warn">
              <CircleAlert aria-hidden="true" className="size-4" /> {story.issue_count} {story.issue_count === 1 ? "Hinweis" : "Hinweise"}
            </span>
          ) : null}
          {story.is_company_news ? <Badge tone="neutral">Unternehmensmeldung</Badge> : null}
          {story.is_network ? <Badge tone="neutral">Aus unserem Netzwerk</Badge> : null}
        </div>
        {story.reasons.length > 0 ? (
          <p className="mt-3 text-sm">
            <span className="text-muted">Warum: </span>
            {story.reasons.filter((r) => r !== "Aus unserem Netzwerk").join(" · ")}
          </p>
        ) : null}
      </div>
    </article>
  );
}
