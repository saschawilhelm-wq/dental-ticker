import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, ClipboardCheck, Inbox, Rss, Sparkles, type LucideIcon } from "lucide-react";
import { fetchRunStatusLabels } from "@/config/taxonomy";
import { Badge, LoadingBlock, PageHeader, SectionHeading, SourceMark, cardClass, linkClass } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { listFetchRuns } from "@/lib/db/fetch-runs";
import { getOverview, latestRawItems } from "@/lib/db/raw-items";
import { listSources } from "@/lib/db/sources";
import { countStoriesByStatus, listAssessmentPairs, listStories } from "@/lib/db/stories";
import { aiApiKey } from "@/lib/ai/client";
import { importanceBand } from "@/lib/scoring/score";
import { agreementRate } from "@/lib/validation/story-form";
import { StoryCard } from "./story-card";
import { formatLongDate, formatRelative } from "@/lib/format";
import { RawItemRow } from "./raw-item-row";
import { SourceState } from "./source-state";
import { runTone } from "./status";

export const metadata: Metadata = { title: "Übersicht" };

function Stat({ label, value, href, icon: Icon, hint }: { label: string; value: number; href: string; icon: LucideIcon; hint?: string }) {
  return (
    <Link href={href} className={`${cardClass} group flex flex-col gap-3 p-5 transition-colors duration-300 hover:border-border-strong`}>
      <span className="flex items-center justify-between text-sm text-muted">
        {label}
        <Icon aria-hidden="true" className="size-5 text-subtle group-hover:text-foreground" />
      </span>
      <span className="font-serif text-4xl font-semibold tabular-nums">{value.toLocaleString("de-DE")}</span>
      {hint ? <span className="text-sm text-muted">{hint}</span> : null}
    </Link>
  );
}

async function Dashboard() {
  await requireAdmin();
  const now = new Date();
  const [overview, latest, sources, problems, statusCounts, topStories, pairs] = await Promise.all([
    getOverview(),
    latestRawItems(6),
    listSources(),
    listFetchRuns({ onlyProblems: true, limit: 3 }),
    countStoriesByStatus(),
    listStories({ status: "published", sort: "wichtigkeit", limit: 5 }),
    listAssessmentPairs(),
  ]);
  const count = (status: string) => statusCounts.find((c) => c.status === status)?.n ?? 0;
  const calibration = agreementRate(
    pairs.map((p) => ({ aiBand: importanceBand(p.importance ?? 0), editorBand: p.editor_importance, editorRelevant: p.relevant })),
  );
  const aiActive = aiApiKey() !== null;
  const healthy = overview.sources_failing === 0 && overview.errors_last_24h === 0;

  return (
    <>
      <PageHeader
        eyebrow={formatLongDate(now)}
        title="Guten Tag"
        description={
          overview.items_today > 0
            ? `Heute ${overview.items_today === 1 ? "ist 1 neue Meldung" : `sind ${overview.items_today} neue Meldungen`} eingegangen.`
            : "Heute sind noch keine neuen Meldungen eingegangen."
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Heute eingegangen" value={overview.items_today} href="/admin/rohdaten" icon={Inbox} />
        <Stat label="Im Ticker" value={count("published")} href="/admin/ticker?status=published" icon={Sparkles} />
        <Stat label="Zur Prüfung" value={count("in_review")} href="/admin/pruefung" icon={ClipboardCheck} />
        <Stat label="Aktive Quellen" value={overview.sources_active} href="/admin/quellen" icon={Rss} hint={`von ${overview.sources_total}`} />
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-12">
        {topStories.length > 0 ? (
          <section aria-labelledby="wichtig">
            <SectionHeading
              action={
                <Link href="/admin/ticker" className={`inline-flex items-center gap-1 text-sm ${linkClass}`}>
                  Ganzer Ticker <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              }
            >
              <span id="wichtig">Das Wichtigste</span>
            </SectionHeading>
            <div className={`${cardClass} divide-y divide-border overflow-hidden`}>
              {topStories.map((story) => (
                <StoryCard key={story.id} story={story} showStatus={false} />
              ))}
            </div>
          </section>
        ) : null}
        <section aria-labelledby="neueste">
          <SectionHeading
            action={
              <Link href="/admin/rohdaten" className={`inline-flex items-center gap-1 text-sm ${linkClass}`}>
                Alle Meldungen <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            }
          >
            <span id="neueste">Neu eingegangen (Rohdaten)</span>
          </SectionHeading>
          <div className={`${cardClass} divide-y divide-border overflow-hidden`}>
            {latest.map((item) => (
              <RawItemRow key={item.id} item={item} />
            ))}
          </div>
        </section>
        </div>

        <aside className="flex flex-col gap-10">
          <section aria-labelledby="ki">
            <SectionHeading>
              <span id="ki">KI-Auswertung</span>
            </SectionHeading>
            <div className={`${cardClass} flex flex-col gap-3 p-4 text-sm`}>
              <p>
                {aiActive ? <Badge tone="ok">Aktiv</Badge> : <Badge tone="warn">Inaktiv: kein API-Schlüssel</Badge>}
              </p>
              <p className="text-muted">
                Kalibrierung:{" "}
                {calibration.total === 0
                  ? "noch keine Einschätzungen der Redaktion."
                  : `${calibration.agree} von ${calibration.total} Einschätzungen stimmen überein (${Math.round((calibration.rate ?? 0) * 100)} %).`}{" "}
                Ziel vor dem Livegang: rund 50 bewertete Meldungen.
              </p>
            </div>
          </section>
          <section aria-labelledby="quellen-zustand">
            <SectionHeading>
              <span id="quellen-zustand">Zustand der Quellen</span>
            </SectionHeading>
            <ul className={`${cardClass} divide-y divide-border`}>
              {sources.map((source) => (
                <li key={source.id} className="flex items-start gap-3 px-4 py-3">
                  <SourceMark name={source.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.95rem] leading-snug font-medium">{source.name}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                      <SourceState source={source} compact />
                      {source.is_active ? formatRelative(source.last_success_at, now) : null}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="probleme">
            <SectionHeading>
              <span id="probleme">Probleme</span>
            </SectionHeading>
            {healthy ? (
              <p className={`${cardClass} p-4`}>
                <Badge tone="ok">Keine Fehler in den letzten 24 Stunden</Badge>
              </p>
            ) : (
              <ul className={`${cardClass} divide-y divide-border`}>
                {problems.map((run) => (
                  <li key={run.id} className="flex flex-col gap-1 px-4 py-3 text-sm">
                    <span className="flex flex-wrap items-center gap-2">
                      <Badge tone={runTone(run.status)}>{fetchRunStatusLabels[run.status]}</Badge>
                      <span className="text-muted">{formatRelative(run.started_at, now)}</span>
                    </span>
                    <span className="font-medium">{run.source_name}</span>
                    {run.error ? <span className="text-muted">{run.error}</span> : null}
                  </li>
                ))}
                <li className="px-4 py-3 text-sm">
                  <Link href="/admin/abrufe?nur=probleme" className={linkClass}>
                    Alle Probleme im Abrufprotokoll
                  </Link>
                </li>
              </ul>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}

export default function AdminHomePage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <Dashboard />
    </Suspense>
  );
}
