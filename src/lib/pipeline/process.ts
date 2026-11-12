import { createHash } from "node:crypto";
import type { Pool } from "pg";
import { aiConfig } from "@/config/ai";
import type { AiClient } from "@/lib/ai/client";
import { analysisSystemPrompt, analysisUserMessage, checkUserMessage, loadPrompt } from "@/lib/ai/prompts";
import { analysisSchema, checkSchema, type Analysis, type CheckResult } from "@/lib/ai/schemas";
import {
  attachToStory,
  claimRawItemsForAnalysis,
  claimStoriesForReanalysis,
  countAnalysesToday,
  createStory,
  findClusterCandidates,
  insertAiRun,
  linkAiRunsToStory,
  markRawError,
  markRawIgnored,
  updateStoryFromAnalysis,
  type RawItemForAnalysis,
  type StoryWrite,
} from "@/lib/db/stories";
import { dayKey } from "@/lib/format";
import { scoreStory } from "@/lib/scoring/score";
import { cleanIsoDate, decidePublication, factsFromAnalysis } from "./decide";
import { copyOverlap } from "./overlap";

export type PipelineDeps = {
  pool: Pool;
  ai: AiClient;
  now: () => Date;
  /** Prompt-Texte; Standard: aus /prompts geladen. */
  prompts?: { analyse: string; pruefung: string };
};

export type ItemOutcome =
  | { rawItemId: string; result: "story"; storyId: string; status: "published" | "in_review"; importance: number }
  | { rawItemId: string; result: "attached"; storyId: string }
  | { rawItemId: string; result: "ignored"; reason: string }
  | { rawItemId: string; result: "retry" | "error"; error: string };

const sha = (text: string) => createHash("sha256").update(text).digest("hex");

function prompts(deps: PipelineDeps) {
  return (
    deps.prompts ?? {
      analyse: loadPrompt(aiConfig.promptVersions.analyse),
      pruefung: loadPrompt(aiConfig.promptVersions.pruefung),
    }
  );
}

async function runAnalysis(item: RawItemForAnalysis, candidates: { id: string; headline: string; date: string | null }[], deps: PipelineDeps) {
  const system = analysisSystemPrompt(prompts(deps).analyse);
  const user = analysisUserMessage(
    {
      title: item.title,
      sourceName: item.source_name,
      sourceKind: item.source_kind,
      trustLevel: item.trust_level,
      url: item.url,
      publishedAt: item.published_at ? new Date(item.published_at).toISOString().slice(0, 10) : null,
      text: item.raw_text,
      candidates,
    },
    aiConfig.maxSourceChars,
  );
  const started = Date.now();
  const result = await deps.ai.structured({
    schema: analysisSchema,
    system,
    user,
    effort: aiConfig.effort.analyse,
    maxTokens: aiConfig.maxTokens.analyse,
  });
  const runId = await insertAiRun(
    {
      kind: "analyse",
      rawItemId: item.id,
      storyId: null,
      modelRequested: deps.ai.model,
      modelServed: result.modelServed,
      promptVersion: aiConfig.promptVersions.analyse,
      inputHash: sha(system + "\n" + user),
      output: result.output,
      stopReason: result.stopReason,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      error: result.error,
      durationMs: Date.now() - started,
    },
    deps.pool,
  );
  return { analysis: result.output as Analysis | null, error: result.error, runId };
}

async function runCheck(item: RawItemForAnalysis, analysis: Analysis, deps: PipelineDeps) {
  const system = prompts(deps).pruefung;
  const user = checkUserMessage(item.raw_text ?? "", item.title, analysis, aiConfig.maxSourceChars);
  const started = Date.now();
  const result = await deps.ai.structured({
    schema: checkSchema,
    system,
    user,
    effort: aiConfig.effort.pruefung,
    maxTokens: aiConfig.maxTokens.pruefung,
  });
  const runId = await insertAiRun(
    {
      kind: "pruefung",
      rawItemId: item.id,
      storyId: null,
      modelRequested: deps.ai.model,
      modelServed: result.modelServed,
      promptVersion: aiConfig.promptVersions.pruefung,
      inputHash: sha(system + "\n" + user),
      output: result.output,
      stopReason: result.stopReason,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      error: result.error,
      durationMs: Date.now() - started,
    },
    deps.pool,
  );
  return { check: result.output as CheckResult | null, error: result.error, runId };
}

/** Baut aus Analyse, Bewertung und Prüfung den Datensatz einer Story. */
async function buildStory(item: RawItemForAnalysis, analysis: Analysis, deps: PipelineDeps) {
  const facts = factsFromAnalysis(analysis);
  const score = scoreStory(facts, { trustLevel: item.trust_level, today: dayKey(deps.now()) });
  const { check, error: checkError, runId } = await runCheck(item, analysis, deps);
  const decision = decidePublication({
    analysis,
    check,
    checkError,
    sourceKind: item.source_kind,
    copyOverlap: copyOverlap(analysis.summary, item.raw_text ?? ""),
  });
  const story: StoryWrite = {
    status: decision.status,
    headline: analysis.headline,
    summary: analysis.summary,
    wasBedeutetDas: analysis.was_bedeutet_das,
    handlungsbedarf: score.actionLevel,
    frist: cleanIsoDate(analysis.frist),
    category: analysis.kategorie,
    sicherheit: analysis.sicherheit,
    facts: {
      ...facts,
      deadline: cleanIsoDate(analysis.frist),
      fristBeschreibung: analysis.frist_beschreibung,
      betroffenheitBegruendung: analysis.betroffenheit_begruendung,
    },
    importance: score.importance,
    reasons: item.is_network ? [...score.reasons, "Aus unserem Netzwerk"] : score.reasons,
    termin: cleanIsoDate(analysis.termin),
    isCompanyNews: analysis.unternehmensmeldung && !analysis.sicherheit_rueckruf,
    checkStatus: check === null ? "offen" : decision.issues.length === 0 ? "bestanden" : "abweichung",
    checkIssues: decision.issues,
    aiChecked: decision.aiChecked,
    analysisVersion: `${aiConfig.promptVersions.analyse}+${aiConfig.promptVersions.pruefung}`,
    roleScores: score.roleScores,
  };
  return { story, checkRunId: runId };
}

/** Verarbeitet einen neuen Rohdaten-Eintrag vollständig. Wirft nicht. */
export async function processRawItem(item: RawItemForAnalysis, deps: PipelineDeps): Promise<ItemOutcome> {
  try {
    const candidates = (
      await findClusterCandidates(item.title, aiConfig.clustering, deps.pool)
    ).map((c) => ({ id: c.id, headline: c.headline, date: dayKey(new Date(c.first_seen_at)) }));

    const { analysis, error, runId } = await runAnalysis(item, candidates, deps);
    if (!analysis) {
      if (item.analysis_attempts >= aiConfig.maxAttempts) {
        await markRawError(item.id, `Analyse fehlgeschlagen: ${error}`, deps.pool);
        return { rawItemId: item.id, result: "error", error: error ?? "unbekannt" };
      }
      return { rawItemId: item.id, result: "retry", error: error ?? "unbekannt" };
    }

    if (analysis.betroffenheit === "keine") {
      await markRawIgnored(item.id, `Kein Bezug: ${analysis.betroffenheit_begruendung}`, deps.pool);
      return { rawItemId: item.id, result: "ignored", reason: analysis.betroffenheit_begruendung };
    }

    const sameEvent = analysis.gleiches_ereignis_wie;
    if (sameEvent && candidates.some((c) => c.id === sameEvent)) {
      await attachToStory(sameEvent, item.id, deps.pool);
      await linkAiRunsToStory([runId], sameEvent, deps.pool);
      return { rawItemId: item.id, result: "attached", storyId: sameEvent };
    }

    const { story, checkRunId } = await buildStory(item, analysis, deps);
    const storyId = await createStory(item.id, story, deps.pool);
    await linkAiRunsToStory([runId, checkRunId], storyId, deps.pool);
    return { rawItemId: item.id, result: "story", storyId, status: story.status as "published" | "in_review", importance: story.importance };
  } catch (error) {
    return { rawItemId: item.id, result: "retry", error: (error as Error).message };
  }
}

/** Erneute Analyse einer bestehenden Story (vom Admin angefordert). */
export async function reanalyzeStory(item: RawItemForAnalysis & { story_id: string }, deps: PipelineDeps): Promise<ItemOutcome> {
  try {
    const { analysis, error, runId } = await runAnalysis(item, [], deps);
    if (!analysis) return { rawItemId: item.id, result: "error", error: error ?? "unbekannt" };
    const { story, checkRunId } = await buildStory(item, analysis, deps);
    // Erneut analysierte Meldungen ohne Bezug werden gesperrt statt gelöscht.
    if (analysis.betroffenheit === "keine") story.status = "in_review";
    await updateStoryFromAnalysis(item.story_id, story, deps.pool);
    await linkAiRunsToStory([runId, checkRunId], item.story_id, deps.pool);
    return { rawItemId: item.id, result: "story", storyId: item.story_id, status: story.status as "published" | "in_review", importance: story.importance };
  } catch (error) {
    return { rawItemId: item.id, result: "error", error: (error as Error).message };
  }
}

export type PipelineSummary = { outcomes: ItemOutcome[]; skippedBudget: boolean };

/** Ein Takt der Pipeline mit Kostenbremse pro Takt und pro Tag. */
export async function runPipelineTick(deps: PipelineDeps): Promise<PipelineSummary> {
  const usedToday = await countAnalysesToday(deps.pool);
  const budget = Math.min(aiConfig.maxAnalysesPerTick, aiConfig.maxAnalysesPerDay - usedToday);
  if (budget <= 0) return { outcomes: [], skippedBudget: true };

  const outcomes: ItemOutcome[] = [];
  const reanalyses = await claimStoriesForReanalysis(budget, deps.pool);
  for (const item of reanalyses) outcomes.push(await reanalyzeStory(item, deps));

  const remaining = budget - reanalyses.length;
  if (remaining > 0) {
    const items = await claimRawItemsForAnalysis(remaining, aiConfig.maxAttempts, deps.pool);
    for (const item of items) outcomes.push(await processRawItem(item, deps));
  }
  return { outcomes, skippedBudget: false };
}
