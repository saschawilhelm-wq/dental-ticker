import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Ban, CircleCheck, ExternalLink, RefreshCw, Undo2 } from "lucide-react";
import {
  actionLevelLabels,
  bindingnessLabels,
  categoryLabels,
  certaintyLabels,
  checkStatusLabels,
  roleLabels,
  roles,
  storyStatusLabels,
} from "@/config/taxonomy";
import {
  Badge,
  LoadingBlock,
  SourceMark,
  buttonClass,
  cardClass,
  inputClass,
  linkClass,
  quietButtonClass,
  secondaryButtonClass,
} from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { getAiRuns, getAssessment, getRoleScores, getStory, getStorySources } from "@/lib/db/stories";
import { formatDate, formatDateTime, hostOf } from "@/lib/format";
import { isUuid } from "@/lib/validation/filters";
import { ImportanceMark } from "../../story-card";
import { actionTone, storyTone } from "../../status";
import { assessmentAction, decideStoryAction, reanalyzeAction } from "../actions";
import { EditorialForm } from "../editorial-form";

export const metadata: Metadata = { title: "Meldung bearbeiten" };

const obligationLabel = { pflicht: "Pflicht", empfehlung: "Empfehlung", information: "Information" } as const;
const moneyLabel = { honorar: "Honorar/Abrechnung", kosten: "Kosten", sanktion: "Sanktion", keins: "—" } as const;

function DecisionButton({ id, decision, children, primary }: { id: string; decision: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <form action={decideStoryAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="decision" value={decision} />
      <button type="submit" className={`${primary ? buttonClass : secondaryButtonClass} w-full`}>
        {children}
      </button>
    </form>
  );
}

async function StoryDetail({ params }: { params: PageProps<"/admin/ticker/[id]">["params"] }) {
  await requireAdmin();
  const { id } = await params;
  const story = isUuid(id) ? await getStory(id) : null;
  if (!story) notFound();
  const [sources, scores, runs, assessment] = await Promise.all([
    getStorySources(story.id),
    getRoleScores(story.id),
    getAiRuns(story.id),
    getAssessment(story.id),
  ]);
  const scoreByRole = Object.fromEntries(scores.map((s) => [s.role, s.score]));
  const facts = story.facts;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-10">
        <header className="flex gap-5">
          <div className="pt-1">
            <ImportanceMark value={story.importance} />
          </div>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
              <Badge tone={storyTone(story.status)}>{storyStatusLabels[story.status]}</Badge>
              {story.category ? <span className="font-medium text-foreground">{categoryLabels[story.category]}</span> : null}
              {story.handlungsbedarf ? <Badge tone={actionTone(story.handlungsbedarf)}>{actionLevelLabels[story.handlungsbedarf]}</Badge> : null}
              {story.is_company_news ? <Badge tone="neutral">Unternehmensmeldung</Badge> : null}
              {story.is_network ? <Badge tone="neutral">Aus unserem Netzwerk</Badge> : null}
            </p>
            <h1 className="mt-2 font-serif text-[1.9rem] font-semibold leading-tight tracking-tight">{story.headline}</h1>
            {story.reasons.length > 0 ? (
              <p className="mt-3 text-sm"><span className="text-muted">Warum: </span>{story.reasons.join(" · ")}</p>
            ) : null}
          </div>
        </header>

        {story.check_issues.length > 0 ? (
          <section aria-labelledby="hinweise" className="rounded-xl border border-warn/30 bg-warn-bg p-5">
            <h2 id="hinweise" className="mb-3 font-semibold text-warn">Hinweise der Prüfung</h2>
            <ul className="flex flex-col gap-3 text-sm">
              {story.check_issues.map((issue, i) => (
                <li key={i}>
                  <span className="font-medium">{issue.feld}:</span> {issue.problem}
                  {issue.aussage && issue.aussage !== "—" ? <span className="block text-muted">„{issue.aussage}“</span> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="bearbeiten" className={`${cardClass} p-5 sm:p-7`}>
          <h2 id="bearbeiten" className="mb-5 font-serif text-xl font-semibold">Text für die Leser</h2>
          <EditorialForm
            story={{
              id: story.id,
              headline: story.headline ?? "",
              summary: story.summary ?? "",
              wasBedeutetDas: story.was_bedeutet_das ?? "",
              handlungsbedarf: story.handlungsbedarf ?? "keiner",
              frist: story.frist,
              category: story.category ?? "recht_politik",
            }}
          />
        </section>

        <section aria-labelledby="quellen">
          <h2 id="quellen" className="mb-4 font-serif text-xl font-semibold">Quellen</h2>
          <ul className="flex flex-col gap-4">
            {sources.map((src) => (
              <li key={src.raw_item_id} className={`${cardClass} p-5`}>
                <div className="flex items-start gap-3">
                  <SourceMark name={src.source_name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted">
                      {src.source_name} · Stufe {src.trust_level} · {formatDateTime(src.published_at ?? src.fetched_at)}
                      {src.is_primary ? " · Hauptquelle" : ""}
                    </p>
                    <p className="mt-1 font-medium">{src.title}</p>
                    <a href={src.url} target="_blank" rel="noopener noreferrer" className={`mt-1 inline-flex items-center gap-1 text-sm ${linkClass}`}>
                      {hostOf(src.url)} <ExternalLink aria-hidden="true" className="size-3.5" />
                    </a>
                    {src.raw_text ? (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm text-muted hover:text-foreground">Rohtext anzeigen (nur intern)</summary>
                        <div className="mt-3 max-w-[68ch] whitespace-pre-wrap border-l-2 border-border-strong pl-4 text-sm leading-relaxed">{src.raw_text}</div>
                      </details>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="ki-laeufe">
          <h2 id="ki-laeufe" className="mb-4 font-serif text-xl font-semibold">KI-Protokoll</h2>
          {runs.length === 0 ? <p className={`${cardClass} p-5 text-sm text-muted`}>Keine KI-Läufe protokolliert.</p> : null}
          <ul className={`${cardClass} divide-y divide-border text-sm ${runs.length === 0 ? "hidden" : ""}`}>
            {runs.map((run) => (
              <li key={run.id} className="flex flex-wrap gap-x-4 gap-y-1 px-5 py-3">
                <span className="font-medium">{run.kind === "analyse" ? "Analyse" : "Prüfung"}</span>
                <span className="text-muted">{formatDateTime(run.created_at)}</span>
                <span className="text-muted">Prompt {run.prompt_version}</span>
                <span className="text-muted">Modell {run.model_served ?? run.model_requested}</span>
                {run.input_tokens !== null ? <span className="text-muted">{run.input_tokens} / {run.output_tokens} Tokens</span> : null}
                {run.error ? <span className="text-error">{run.error}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="flex flex-col gap-4">
        <div className={`${cardClass} flex flex-col gap-2 p-5`}>
          <h2 className="mb-1 text-sm font-semibold text-muted">Entscheidung</h2>
          {story.status !== "published" ? (
            <DecisionButton id={story.id} decision="published" primary>
              <CircleCheck aria-hidden="true" className="size-4" /> Freigeben
            </DecisionButton>
          ) : null}
          {story.status !== "blocked" ? (
            <DecisionButton id={story.id} decision="blocked">
              <Ban aria-hidden="true" className="size-4" /> Sperren
            </DecisionButton>
          ) : null}
          {story.status === "published" || story.status === "blocked" ? (
            <DecisionButton id={story.id} decision="in_review">
              <Undo2 aria-hidden="true" className="size-4" /> Zurück in die Prüfung
            </DecisionButton>
          ) : null}
          <form action={reanalyzeAction}>
            <input type="hidden" name="id" value={story.id} />
            <button type="submit" className={`${quietButtonClass} w-full`} disabled={story.reanalyze}>
              <RefreshCw aria-hidden="true" className="size-4" /> {story.reanalyze ? "Neu-Analyse angefordert" : "Neu analysieren lassen"}
            </button>
          </form>
          <p className="mt-1 text-sm text-muted">
            {story.reviewed_at
              ? `Zuletzt entschieden von ${story.reviewer_email ?? "unbekannt"} am ${formatDateTime(story.reviewed_at)}.`
              : story.ai_checked
                ? "Automatisch freigegeben nach bestandener KI-Prüfung."
                : `${checkStatusLabels[story.check_status]}.`}
          </p>
        </div>

        <dl className={`${cardClass} flex flex-col gap-3 p-5 text-sm`}>
          <h2 className="text-sm font-semibold text-muted">Fakten laut KI</h2>
          {facts ? (
            <>
              <div><dt className="text-muted">Betroffenheit</dt><dd>{facts.affectedness}{facts.betroffenheitBegruendung ? ` — ${facts.betroffenheitBegruendung}` : ""}</dd></div>
              <div><dt className="text-muted">Verpflichtung</dt><dd>{obligationLabel[facts.obligation]}</dd></div>
              <div><dt className="text-muted">Frist</dt><dd>{facts.deadline ? `${formatDate(facts.deadline)}${facts.fristBeschreibung ? ` — ${facts.fristBeschreibung}` : ""}` : "—"}</dd></div>
              <div><dt className="text-muted">Geld</dt><dd>{moneyLabel[facts.money]}</dd></div>
              <div><dt className="text-muted">Stand</dt><dd>{bindingnessLabels[facts.bindingness]}</dd></div>
              <div><dt className="text-muted">Belastbarkeit</dt><dd>{story.sicherheit ? certaintyLabels[story.sicherheit] : "—"}</dd></div>
              {story.termin ? <div><dt className="text-muted">Termin</dt><dd>{formatDate(story.termin)}</dd></div> : null}
            </>
          ) : (
            <p className="text-muted">Keine Fakten gespeichert.</p>
          )}
        </dl>

        <div className={`${cardClass} p-5 text-sm`}>
          <h2 className="mb-3 text-sm font-semibold text-muted">Wichtigkeit je Rolle</h2>
          <ul className="flex flex-col gap-2">
            {roles.map((role) => (
              <li key={role} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate" title={roleLabels[role]}>{roleLabels[role]}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${scoreByRole[role] ?? 0}%` }} />
                </span>
                <span className="w-8 text-right tabular-nums">{scoreByRole[role] ?? "—"}</span>
              </li>
            ))}
          </ul>
        </div>

        <form action={assessmentAction} className={`${cardClass} flex flex-col gap-3 p-5 text-sm`}>
          <h2 className="text-sm font-semibold text-muted">Einschätzung der Redaktion</h2>
          <p className="text-muted">Für die Kalibrierung: Wie würden Sie diese Meldung einordnen?</p>
          <input type="hidden" name="id" value={story.id} />
          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 font-medium">Relevant für Praxen?</legend>
            {(["ja", "nein"] as const).map((v) => (
              <label key={v} className="flex min-h-11 items-center gap-2">
                <input type="radio" name="relevant" value={v} defaultChecked={assessment ? (assessment.relevant ? v === "ja" : v === "nein") : v === "ja"} className="size-5" />
                {v === "ja" ? "Ja" : "Nein"}
              </label>
            ))}
          </fieldset>
          <div className="flex flex-col gap-1">
            <label htmlFor="importance" className="font-medium">Wichtigkeit</label>
            <select id="importance" name="importance" defaultValue={assessment?.importance ?? "mittel"} className={inputClass}>
              <option value="hoch">Hoch</option>
              <option value="mittel">Mittel</option>
              <option value="niedrig">Niedrig</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="note" className="font-medium">Notiz (optional)</label>
            <textarea id="note" name="note" rows={2} defaultValue={assessment?.note ?? ""} className={inputClass} />
          </div>
          <button type="submit" className={secondaryButtonClass}>{assessment ? "Einschätzung ändern" : "Einschätzung speichern"}</button>
        </form>
      </aside>
    </div>
  );
}

export default function StoryPage(props: PageProps<"/admin/ticker/[id]">) {
  return (
    <>
      <p className="mb-6">
        <Link href="/admin/ticker" className={`${quietButtonClass} -ml-3`}>
          <ArrowLeft aria-hidden="true" className="size-4" /> Zum Ticker
        </Link>
      </p>
      <Suspense fallback={<LoadingBlock />}>
        <StoryDetail params={props.params} />
      </Suspense>
    </>
  );
}
