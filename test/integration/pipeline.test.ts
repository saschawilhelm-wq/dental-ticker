import type { Pool } from "pg";
import type { z } from "zod";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { AiCallResult, AiClient, StructuredRequest } from "@/lib/ai/client";
import { analysisSchema, type Analysis, type CheckResult } from "@/lib/ai/schemas";
import { getStory, getStorySources, requestReanalysis } from "@/lib/db/stories";
import { runPipelineTick } from "@/lib/pipeline/process";
import { sampleAnalysis } from "@/lib/pipeline/pipeline.test";
import { freshDatabase, testDatabaseUrl } from "./db";

/**
 * Attrappe der KI: liefert vorgegebene Antworten der Reihe nach. Echte
 * API-Aufrufe finden in Tests nie statt.
 */
class ScriptedAi implements AiClient {
  readonly model = "test-model";
  calls: { kind: "analyse" | "pruefung"; user: string }[] = [];
  constructor(private script: { analyse: (Analysis | Error)[]; pruefung: (CheckResult | Error)[] }) {}

  async structured<S extends z.ZodType>(request: StructuredRequest<S>): Promise<AiCallResult<z.infer<S>>> {
    const kind = request.schema === analysisSchema ? "analyse" : "pruefung";
    this.calls.push({ kind, user: request.user });
    const next = this.script[kind].shift();
    if (!next) throw new Error(`Keine vorbereitete Antwort für ${kind}`);
    const usage = { modelServed: "test-model", stopReason: "end_turn", inputTokens: 100, outputTokens: 50 };
    if (next instanceof Error) return { ...usage, output: null, error: next.message };
    return { ...usage, output: next as z.infer<S>, error: null };
  }
}

const passed: CheckResult = { ergebnis: "bestanden", probleme: [] };

describe.skipIf(!testDatabaseUrl)("KI-Pipeline gegen die Datenbank", () => {
  let pool: Pool;
  let sourceId: string;
  const now = () => new Date("2026-11-12T08:00:00Z");
  const prompts = { analyse: "Analyse {{KATEGORIEN}}", pruefung: "Prüfung" };

  beforeAll(async () => {
    pool = await freshDatabase();
  });
  afterAll(async () => {
    await pool?.end();
  });
  beforeEach(async () => {
    await pool.query("TRUNCATE sources, stories, ai_runs CASCADE");
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO sources (name, slug, feed_url, trust_level, kind) VALUES ('gematik', 'gematik', 'https://g.example/f', 'A', 'primary') RETURNING id`,
    );
    sourceId = rows[0].id;
  });

  async function addRaw(title: string, text = "Quelltext mit Frist 31.01.2027.") {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO raw_items (source_id, url, url_normalized, title, published_at, raw_text, content_hash)
       VALUES ($1, $2, $2, $3, now(), $4, md5($3)) RETURNING id`,
      [sourceId, `https://g.example/${encodeURIComponent(title)}`, title, text],
    );
    return rows[0].id;
  }

  it("legt eine geprüfte Story an, bewertet sie und protokolliert beide KI-Läufe", async () => {
    const rawId = await addRaw("Konnektor-Update Pflicht");
    const ai = new ScriptedAi({ analyse: [sampleAnalysis], pruefung: [passed] });
    const { outcomes } = await runPipelineTick({ pool, ai, now, prompts });

    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]).toMatchObject({ result: "story", status: "published", importance: 100 });
    const storyId = (outcomes[0] as { storyId: string }).storyId;

    const story = await getStory(storyId, pool);
    expect(story).toMatchObject({
      status: "published",
      headline: sampleAnalysis.headline,
      handlungsbedarf: "handeln",
      frist: "2027-01-31",
      check_status: "bestanden",
      ai_checked: true,
      category: "telematik",
    });
    expect(story?.reasons).toContain("Frist 31.01.2027");
    expect(story?.published_at).not.toBeNull();

    const raw = await pool.query("SELECT status FROM raw_items WHERE id = $1", [rawId]);
    expect(raw.rows[0].status).toBe("clustered");

    const runs = await pool.query("SELECT kind, prompt_version, model_requested, story_id FROM ai_runs ORDER BY created_at");
    expect(runs.rows.map((r) => [r.kind, r.prompt_version, r.story_id])).toEqual([
      ["analyse", "analyse.v1", storyId],
      ["pruefung", "pruefung.v1", storyId],
    ]);

    const scores = await pool.query("SELECT role, score FROM story_role_scores WHERE story_id = $1 ORDER BY role", [storyId]);
    expect(scores.rows).toHaveLength(5);
  });

  it("sortiert Meldungen ohne Bezug aus, ohne Prüfung und ohne Story", async () => {
    const rawId = await addRaw("Arzneimittel-Richtlinie: Everolimus");
    const ai = new ScriptedAi({
      analyse: [{ ...sampleAnalysis, betroffenheit: "keine", betroffenheit_begruendung: "Nur Arzneimittel." }],
      pruefung: [],
    });
    const { outcomes } = await runPipelineTick({ pool, ai, now, prompts });
    expect(outcomes[0]).toMatchObject({ result: "ignored" });
    expect(ai.calls.map((c) => c.kind)).toEqual(["analyse"]);
    const raw = await pool.query("SELECT status, ignore_reason FROM raw_items WHERE id = $1", [rawId]);
    expect(raw.rows[0]).toEqual({ status: "ignored", ignore_reason: "Kein Bezug: Nur Arzneimittel." });
  });

  it("legt Abweichungen der Prüfung in die Review-Warteschlange", async () => {
    await addRaw("Punktwerte 2027");
    const ai = new ScriptedAi({
      analyse: [sampleAnalysis],
      pruefung: [{ ergebnis: "abweichung", probleme: [{ feld: "frist", aussage: "31.01.2027", problem: "Nicht in der Quelle." }] }],
    });
    const { outcomes } = await runPipelineTick({ pool, ai, now, prompts });
    const story = await getStory((outcomes[0] as { storyId: string }).storyId, pool);
    expect(story).toMatchObject({ status: "in_review", check_status: "abweichung", ai_checked: false, issue_count: 1 });
    expect(story?.published_at).toBeNull();
  });

  it("hängt Berichte über dasselbe Ereignis an die bestehende Story", async () => {
    await addRaw("Konnektor-Update wird Pflicht");
    const first = await runPipelineTick({ pool, ai: new ScriptedAi({ analyse: [sampleAnalysis], pruefung: [passed] }), now, prompts });
    const storyId = (first.outcomes[0] as { storyId: string }).storyId;

    await addRaw("Konnektor-Update wird Pflicht für Praxen");
    const ai = new ScriptedAi({ analyse: [{ ...sampleAnalysis, gleiches_ereignis_wie: storyId }], pruefung: [] });
    const second = await runPipelineTick({ pool, ai, now, prompts });

    expect(second.outcomes[0]).toEqual(expect.objectContaining({ result: "attached", storyId }));
    expect(ai.calls[0].user).toContain(`ID ${storyId}`);
    expect(await getStorySources(storyId, pool)).toHaveLength(2);
  });

  it("ignoriert erfundene Kandidaten-IDs und legt eine neue Story an", async () => {
    await addRaw("Etwas Neues");
    const ai = new ScriptedAi({
      analyse: [{ ...sampleAnalysis, gleiches_ereignis_wie: "00000000-0000-0000-0000-000000000000" }],
      pruefung: [passed],
    });
    const { outcomes } = await runPipelineTick({ pool, ai, now, prompts });
    expect(outcomes[0]).toMatchObject({ result: "story" });
  });

  it("versucht fehlgeschlagene Analysen erneut und gibt nach drei Versuchen auf", async () => {
    const rawId = await addRaw("Fehleranfällig");
    const ai = new ScriptedAi({ analyse: [new Error("Ratenlimit"), new Error("Ratenlimit"), new Error("Ratenlimit")], pruefung: [] });
    for (let i = 0; i < 3; i++) await runPipelineTick({ pool, ai, now, prompts });
    const raw = await pool.query("SELECT status, analysis_attempts FROM raw_items WHERE id = $1", [rawId]);
    expect(raw.rows[0]).toEqual({ status: "error", analysis_attempts: 3 });
    // Ein vierter Takt fasst den Eintrag nicht mehr an.
    const fourth = await runPipelineTick({ pool, ai, now, prompts });
    expect(fourth.outcomes).toEqual([]);
  });

  it("analysiert eine Story auf Anforderung neu", async () => {
    await addRaw("Neu zu bewerten");
    const first = await runPipelineTick({ pool, ai: new ScriptedAi({ analyse: [sampleAnalysis], pruefung: [passed] }), now, prompts });
    const storyId = (first.outcomes[0] as { storyId: string }).storyId;
    await requestReanalysis(storyId, pool);

    const ai = new ScriptedAi({ analyse: [{ ...sampleAnalysis, headline: "Neue Überschrift" }], pruefung: [passed] });
    await runPipelineTick({ pool, ai, now, prompts });
    const story = await getStory(storyId, pool);
    expect(story).toMatchObject({ headline: "Neue Überschrift", reanalyze: false, status: "published" });
  });

  it("hält die Tages-Kostenbremse ein", async () => {
    await pool.query(
      `INSERT INTO ai_runs (kind, model_requested, prompt_version, input_hash)
       SELECT 'analyse', 'm', 'analyse.v1', 'h' FROM generate_series(1, 200)`,
    );
    await addRaw("Zu viel heute");
    const result = await runPipelineTick({ pool, ai: new ScriptedAi({ analyse: [], pruefung: [] }), now, prompts });
    expect(result).toEqual({ outcomes: [], skippedBudget: true });
  });
});
