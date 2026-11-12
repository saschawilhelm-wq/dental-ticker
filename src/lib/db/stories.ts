import type { PoolClient } from "pg";
import type {
  ActionLevel,
  Category,
  Certainty,
  CheckStatus,
  Role,
  SourceKind,
  StoryStatus,
  TrustLevel,
} from "@/config/taxonomy";
import type { StoryFacts } from "@/lib/scoring/score";
import { query, queryOne, withTransaction, getPool, type Queryable } from "./pool";
import type { Pool } from "pg";

/* ------------------------------------------------------------------ */
/* Pipeline: Einträge reservieren, Kandidaten, Protokoll               */
/* ------------------------------------------------------------------ */

export type RawItemForAnalysis = {
  id: string;
  title: string;
  url: string;
  published_at: Date | null;
  raw_text: string | null;
  analysis_attempts: number;
  source_id: string;
  source_name: string;
  source_kind: SourceKind;
  trust_level: TrustLevel;
  is_network: boolean;
};

/**
 * Reserviert neue Einträge für die Analyse (neueste zuerst) und zählt den
 * Versuch hoch. Parallel laufende Worker greifen nicht doppelt zu.
 */
export async function claimRawItemsForAnalysis(limit: number, maxAttempts: number, db: Queryable = getPool()) {
  return query<RawItemForAnalysis>(
    `WITH picked AS (
       SELECT r.id FROM raw_items r
        WHERE r.status = 'new' AND r.analysis_attempts < $2
        ORDER BY COALESCE(r.published_at, r.fetched_at) DESC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
     ), bumped AS (
       UPDATE raw_items r SET analysis_attempts = r.analysis_attempts + 1
         FROM picked WHERE r.id = picked.id
       RETURNING r.*
     )
     SELECT b.id, b.title, b.url, b.published_at, b.raw_text, b.analysis_attempts,
            s.id AS source_id, s.name AS source_name, s.kind AS source_kind,
            s.trust_level, s.is_network
       FROM bumped b JOIN sources s ON s.id = b.source_id
      ORDER BY COALESCE(b.published_at, b.fetched_at) DESC`,
    [limit, maxAttempts],
    db,
  );
}

/** Analysen seit Mitternacht deutscher Zeit — für die Tages-Kostenbremse. */
export async function countAnalysesToday(db: Queryable = getPool()): Promise<number> {
  const row = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM ai_runs
      WHERE kind = 'analyse'
        AND created_at >= (date_trunc('day', now() AT TIME ZONE 'Europe/Berlin') AT TIME ZONE 'Europe/Berlin')`,
    [],
    db,
  );
  return row?.n ?? 0;
}

/** Bereits bekannte Stories mit ähnlichem Titel im Zeitfenster — Kandidaten für „gleiches Ereignis“. */
export async function findClusterCandidates(
  title: string,
  options: { minSimilarity: number; windowDays: number; maxCandidates: number },
  db: Queryable = getPool(),
) {
  return query<{ id: string; headline: string; first_seen_at: Date; similarity: number }>(
    `SELECT st.id, st.headline, st.first_seen_at,
            GREATEST(similarity(st.headline, $1), COALESCE(max(similarity(r.title, $1)), 0)) AS similarity
       FROM stories st
       LEFT JOIN story_sources ss ON ss.story_id = st.id
       LEFT JOIN raw_items r ON r.id = ss.raw_item_id
      WHERE st.first_seen_at > now() - make_interval(days => $2)
        AND st.status <> 'archived' AND st.headline IS NOT NULL
      GROUP BY st.id
     HAVING GREATEST(similarity(st.headline, $1), COALESCE(max(similarity(r.title, $1)), 0)) >= $3
      ORDER BY similarity DESC
      LIMIT $4`,
    [title, options.windowDays, options.minSimilarity, options.maxCandidates],
    db,
  );
}

export type AiRunInsert = {
  kind: "analyse" | "pruefung";
  rawItemId: string | null;
  storyId: string | null;
  modelRequested: string;
  modelServed: string | null;
  promptVersion: string;
  inputHash: string;
  output: unknown;
  stopReason: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  error: string | null;
  durationMs: number;
};

export async function insertAiRun(run: AiRunInsert, db: Queryable = getPool()): Promise<string> {
  const row = await queryOne<{ id: string }>(
    `INSERT INTO ai_runs (kind, raw_item_id, story_id, model_requested, model_served, prompt_version,
                          input_hash, output, stop_reason, input_tokens, output_tokens, error, duration_ms)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
    [
      run.kind,
      run.rawItemId,
      run.storyId,
      run.modelRequested,
      run.modelServed,
      run.promptVersion,
      run.inputHash,
      run.output === undefined ? null : JSON.stringify(run.output),
      run.stopReason,
      run.inputTokens,
      run.outputTokens,
      run.error,
      run.durationMs,
    ],
    db,
  );
  return row!.id;
}

export async function linkAiRunsToStory(runIds: string[], storyId: string, db: Queryable = getPool()) {
  if (runIds.length === 0) return;
  await query("UPDATE ai_runs SET story_id = $2 WHERE id = ANY($1::uuid[])", [runIds, storyId], db);
}

export async function markRawIgnored(id: string, reason: string, db: Queryable = getPool()) {
  await query("UPDATE raw_items SET status = 'ignored', ignore_reason = $2 WHERE id = $1", [id, reason], db);
}

export async function markRawError(id: string, reason: string, db: Queryable = getPool()) {
  await query("UPDATE raw_items SET status = 'error', ignore_reason = $2 WHERE id = $1", [id, reason], db);
}

/* ------------------------------------------------------------------ */
/* Stories schreiben                                                  */
/* ------------------------------------------------------------------ */

export type StoryWrite = {
  status: StoryStatus;
  headline: string;
  summary: string;
  wasBedeutetDas: string;
  handlungsbedarf: ActionLevel;
  frist: string | null;
  category: Category;
  sicherheit: Certainty;
  facts: StoryFacts & { fristBeschreibung: string | null; betroffenheitBegruendung: string };
  importance: number;
  reasons: string[];
  termin: string | null;
  isCompanyNews: boolean;
  checkStatus: CheckStatus;
  checkIssues: { feld: string; aussage: string; problem: string }[];
  aiChecked: boolean;
  analysisVersion: string;
  roleScores: Record<Role, number>;
};

function storyValues(s: StoryWrite): unknown[] {
  return [
    s.status,
    s.headline,
    s.summary,
    s.wasBedeutetDas,
    s.handlungsbedarf,
    s.frist,
    s.category,
    s.sicherheit,
    JSON.stringify(s.facts),
    s.importance,
    s.reasons,
    s.termin,
    s.isCompanyNews,
    s.checkStatus,
    JSON.stringify(s.checkIssues),
    s.aiChecked,
    s.analysisVersion,
  ];
}

async function writeRoleScores(client: PoolClient, storyId: string, scores: Record<Role, number>) {
  await client.query("DELETE FROM story_role_scores WHERE story_id = $1", [storyId]);
  for (const [role, score] of Object.entries(scores)) {
    await client.query("INSERT INTO story_role_scores (story_id, role, score) VALUES ($1,$2,$3)", [storyId, role, score]);
  }
}

/** Legt eine Story aus einer Analyse an und verknüpft den Rohdaten-Eintrag als Primärquelle. */
export async function createStory(rawItemId: string, story: StoryWrite, pool: Pool = getPool()): Promise<string> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO stories (status, headline, summary, was_bedeutet_das, handlungsbedarf, frist, category,
                            sicherheit, facts, importance, reasons, termin, is_company_news, check_status,
                            check_issues, ai_checked, analysis_version, published_at)
       VALUES ($1::story_status,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
               CASE WHEN $1::story_status = 'published' THEN now() END)
       RETURNING id`,
      storyValues(story),
    );
    const storyId = rows[0].id;
    await client.query(
      "INSERT INTO story_sources (story_id, raw_item_id, is_primary, position) VALUES ($1,$2,true,0)",
      [storyId, rawItemId],
    );
    await writeRoleScores(client, storyId, story.roleScores);
    await client.query("UPDATE raw_items SET status = 'clustered', ignore_reason = NULL WHERE id = $1", [rawItemId]);
    return storyId;
  }, pool);
}

/** Überschreibt eine Story nach erneuter Analyse. Status und Freigabe werden neu gesetzt. */
export async function updateStoryFromAnalysis(storyId: string, story: StoryWrite, pool: Pool = getPool()): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(
      `UPDATE stories SET status = $1::story_status, headline = $2, summary = $3, was_bedeutet_das = $4, handlungsbedarf = $5,
              frist = $6, category = $7, sicherheit = $8, facts = $9, importance = $10, reasons = $11, termin = $12,
              is_company_news = $13, check_status = $14, check_issues = $15, ai_checked = $16,
              analysis_version = $17, reanalyze = false, reviewed_by = NULL, reviewed_at = NULL,
              published_at = CASE WHEN $1::story_status = 'published' THEN COALESCE(published_at, now()) ELSE NULL END,
              updated_at = now()
        WHERE id = $18`,
      [...storyValues(story), storyId],
    );
    await writeRoleScores(client, storyId, story.roleScores);
  }, pool);
}

/** Hängt einen weiteren Bericht über dasselbe Ereignis an eine bestehende Story. */
export async function attachToStory(storyId: string, rawItemId: string, pool: Pool = getPool()): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO story_sources (story_id, raw_item_id, is_primary, position)
       VALUES ($1, $2, false, (SELECT COALESCE(max(position), 0) + 1 FROM story_sources WHERE story_id = $1))
       ON CONFLICT DO NOTHING`,
      [storyId, rawItemId],
    );
    await client.query("UPDATE raw_items SET status = 'clustered', ignore_reason = NULL WHERE id = $1", [rawItemId]);
    await client.query("UPDATE stories SET updated_at = now() WHERE id = $1", [storyId]);
  }, pool);
}

/* ------------------------------------------------------------------ */
/* Erneute Analyse                                                    */
/* ------------------------------------------------------------------ */

export async function claimStoriesForReanalysis(limit: number, db: Queryable = getPool()) {
  return query<RawItemForAnalysis & { story_id: string }>(
    `WITH picked AS (
       SELECT st.id FROM stories st WHERE st.reanalyze ORDER BY st.updated_at LIMIT $1 FOR UPDATE SKIP LOCKED
     ), cleared AS (
       UPDATE stories st SET reanalyze = false FROM picked WHERE st.id = picked.id RETURNING st.id
     )
     SELECT c.id AS story_id, r.id, r.title, r.url, r.published_at, r.raw_text, r.analysis_attempts,
            s.id AS source_id, s.name AS source_name, s.kind AS source_kind, s.trust_level, s.is_network
       FROM cleared c
       JOIN story_sources ss ON ss.story_id = c.id AND ss.is_primary
       JOIN raw_items r ON r.id = ss.raw_item_id
       JOIN sources s ON s.id = r.source_id`,
    [limit],
    db,
  );
}

/* ------------------------------------------------------------------ */
/* Lesen und redaktionelle Änderungen (Admin)                          */
/* ------------------------------------------------------------------ */

export type StoryListRow = {
  id: string;
  status: StoryStatus;
  headline: string | null;
  summary: string | null;
  handlungsbedarf: ActionLevel | null;
  frist: string | null;
  category: Category | null;
  importance: number | null;
  reasons: string[];
  check_status: CheckStatus;
  ai_checked: boolean;
  is_company_news: boolean;
  first_seen_at: Date;
  published_at: Date | null;
  source_name: string;
  source_count: number;
  is_network: boolean;
  issue_count: number;
};

export type StoryFilter = { status?: StoryStatus; category?: Category; sort: "wichtigkeit" | "neu"; limit: number };

export async function listStories(filter: StoryFilter, db: Queryable = getPool()): Promise<StoryListRow[]> {
  const parts: string[] = [];
  const params: unknown[] = [];
  if (filter.status) {
    params.push(filter.status);
    parts.push(`st.status = $${params.length}`);
  }
  if (filter.category) {
    params.push(filter.category);
    parts.push(`st.category = $${params.length}`);
  }
  params.push(filter.limit);
  const order =
    filter.sort === "wichtigkeit"
      ? "st.importance DESC NULLS LAST, st.first_seen_at DESC"
      : "COALESCE(r.published_at, st.first_seen_at) DESC";
  return query<StoryListRow>(
    `SELECT st.id, st.status, st.headline, st.summary, st.handlungsbedarf, to_char(st.frist, 'YYYY-MM-DD') AS frist,
            st.category, st.importance, st.reasons, st.check_status, st.ai_checked, st.is_company_news,
            st.first_seen_at, st.published_at, s.name AS source_name, s.is_network,
            (SELECT count(*)::int FROM story_sources x WHERE x.story_id = st.id) AS source_count,
            jsonb_array_length(st.check_issues) AS issue_count
       FROM stories st
       JOIN story_sources ss ON ss.story_id = st.id AND ss.is_primary
       JOIN raw_items r ON r.id = ss.raw_item_id
       JOIN sources s ON s.id = r.source_id
       ${parts.length ? `WHERE ${parts.join(" AND ")}` : ""}
      ORDER BY ${order}
      LIMIT $${params.length}`,
    params,
    db,
  );
}

export type StoryDetail = StoryListRow & {
  was_bedeutet_das: string | null;
  sicherheit: Certainty | null;
  facts: (StoryFacts & { fristBeschreibung?: string | null; betroffenheitBegruendung?: string }) | null;
  termin: string | null;
  check_issues: { feld: string; aussage: string; problem: string }[];
  analysis_version: string | null;
  reviewed_at: Date | null;
  reviewer_email: string | null;
  review_note: string | null;
  reanalyze: boolean;
};

export async function getStory(id: string, db: Queryable = getPool()): Promise<StoryDetail | null> {
  const rows = await query<StoryDetail>(
    `SELECT st.*, to_char(st.frist, 'YYYY-MM-DD') AS frist, to_char(st.termin, 'YYYY-MM-DD') AS termin,
            s.name AS source_name, s.is_network, u.email AS reviewer_email,
            (SELECT count(*)::int FROM story_sources x WHERE x.story_id = st.id) AS source_count,
            jsonb_array_length(st.check_issues) AS issue_count
       FROM stories st
       JOIN story_sources ss ON ss.story_id = st.id AND ss.is_primary
       JOIN raw_items r ON r.id = ss.raw_item_id
       JOIN sources s ON s.id = r.source_id
       LEFT JOIN users u ON u.id = st.reviewed_by
      WHERE st.id = $1`,
    [id],
    db,
  );
  return rows[0] ?? null;
}

export async function getStorySources(storyId: string, db: Queryable = getPool()) {
  return query<{
    raw_item_id: string;
    title: string;
    url: string;
    published_at: Date | null;
    fetched_at: Date;
    raw_text: string | null;
    is_primary: boolean;
    source_name: string;
    trust_level: TrustLevel;
  }>(
    `SELECT r.id AS raw_item_id, r.title, r.url, r.published_at, r.fetched_at, r.raw_text, ss.is_primary,
            s.name AS source_name, s.trust_level
       FROM story_sources ss JOIN raw_items r ON r.id = ss.raw_item_id JOIN sources s ON s.id = r.source_id
      WHERE ss.story_id = $1
      ORDER BY ss.is_primary DESC, s.trust_level, ss.position`,
    [storyId],
    db,
  );
}

export async function getRoleScores(storyId: string, db: Queryable = getPool()) {
  return query<{ role: Role; score: number }>("SELECT role, score FROM story_role_scores WHERE story_id = $1", [storyId], db);
}

export async function getAiRuns(storyId: string, db: Queryable = getPool()) {
  return query<{
    id: string;
    kind: string;
    model_requested: string;
    model_served: string | null;
    prompt_version: string;
    stop_reason: string | null;
    input_tokens: number | null;
    output_tokens: number | null;
    error: string | null;
    duration_ms: number | null;
    created_at: Date;
  }>(
    `SELECT id, kind, model_requested, model_served, prompt_version, stop_reason, input_tokens, output_tokens,
            error, duration_ms, created_at
       FROM ai_runs WHERE story_id = $1 ORDER BY created_at DESC`,
    [storyId],
    db,
  );
}

export type EditorialUpdate = {
  headline: string;
  summary: string;
  wasBedeutetDas: string;
  handlungsbedarf: ActionLevel;
  frist: string | null;
  category: Category;
};

/** Redaktionelle Änderung durch einen Menschen. Kennzeichnet die Story als menschlich geprüft. */
export async function updateStoryEditorial(id: string, update: EditorialUpdate, userId: string, db: Queryable = getPool()) {
  await query(
    `UPDATE stories SET headline = $2, summary = $3, was_bedeutet_das = $4, handlungsbedarf = $5, frist = $6,
            category = $7, reviewed_by = $8, reviewed_at = now(), updated_at = now()
      WHERE id = $1`,
    [id, update.headline, update.summary, update.wasBedeutetDas, update.handlungsbedarf, update.frist, update.category, userId],
    db,
  );
}

export async function setStoryStatusByEditor(
  id: string,
  status: "published" | "blocked" | "in_review",
  userId: string,
  note: string | null,
  db: Queryable = getPool(),
) {
  await query(
    `UPDATE stories SET status = $2::story_status, reviewed_by = $3, reviewed_at = now(), review_note = COALESCE($4, review_note),
            published_at = CASE WHEN $2::story_status = 'published' THEN COALESCE(published_at, now()) ELSE published_at END,
            updated_at = now()
      WHERE id = $1`,
    [id, status, userId, note],
    db,
  );
}

export async function requestReanalysis(id: string, db: Queryable = getPool()) {
  await query("UPDATE stories SET reanalyze = true, updated_at = now() WHERE id = $1", [id], db);
}

export async function countStoriesByStatus(db: Queryable = getPool()) {
  return query<{ status: StoryStatus; n: number }>("SELECT status, count(*)::int AS n FROM stories GROUP BY status", [], db);
}

/* ------------------------------------------------------------------ */
/* Kalibrierung                                                       */
/* ------------------------------------------------------------------ */

export async function saveAssessment(
  storyId: string,
  userId: string,
  value: { relevant: boolean; importance: "hoch" | "mittel" | "niedrig"; note: string | null },
  db: Queryable = getPool(),
) {
  await query(
    `INSERT INTO editor_assessments (story_id, user_id, relevant, importance, note)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (story_id) DO UPDATE SET user_id = EXCLUDED.user_id, relevant = EXCLUDED.relevant,
       importance = EXCLUDED.importance, note = EXCLUDED.note, created_at = now()`,
    [storyId, userId, value.relevant, value.importance, value.note],
    db,
  );
}

export async function getAssessment(storyId: string, db: Queryable = getPool()) {
  return queryOne<{ relevant: boolean; importance: "hoch" | "mittel" | "niedrig"; note: string | null }>(
    "SELECT relevant, importance, note FROM editor_assessments WHERE story_id = $1",
    [storyId],
    db,
  );
}

/** Paare aus KI-Wichtigkeit und Redaktionseinschätzung für die Übereinstimmungsquote. */
export async function listAssessmentPairs(db: Queryable = getPool()) {
  return query<{ importance: number | null; editor_importance: "hoch" | "mittel" | "niedrig"; relevant: boolean }>(
    `SELECT st.importance, ea.importance AS editor_importance, ea.relevant
       FROM editor_assessments ea JOIN stories st ON st.id = ea.story_id`,
    [],
    db,
  );
}
