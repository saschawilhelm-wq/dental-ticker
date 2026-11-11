import type { FetchMethod, FetchRunStatus } from "@/config/taxonomy";
import type { PlannedItem } from "@/lib/ingest/plan-items";
import { query, queryOne, withTransaction, type Queryable, getPool } from "./pool";
import type { Source } from "./sources";
import type { Pool } from "pg";

/**
 * Reserviert fällige Quellen atomar für einen Abruf. Mehrere Worker können
 * parallel laufen, ohne dieselbe Quelle doppelt abzurufen (SKIP LOCKED).
 *
 * Nach Fehlern verlängert sich das Intervall (doppelt, vierfach … bis 16-fach),
 * damit eine gestörte Quelle nicht im Minutentakt angefragt wird.
 */
export async function claimDueSources(
  methods: readonly FetchMethod[],
  limit: number,
  db: Queryable = getPool(),
): Promise<Source[]> {
  return query<Source>(
    `UPDATE sources SET last_fetched_at = now()
      WHERE id IN (
        SELECT id FROM sources
         WHERE is_active
           AND fetch_method = ANY($1::fetch_method[])
           AND feed_url IS NOT NULL
           AND (last_fetched_at IS NULL
                OR last_fetched_at
                   + make_interval(mins => fetch_interval_min * LEAST(power(2, consecutive_failures)::int, 16))
                   <= now())
         ORDER BY last_fetched_at NULLS FIRST
         LIMIT $2
         FOR UPDATE SKIP LOCKED
      )
      RETURNING *`,
    [methods, limit],
    db,
  );
}

/** Markiert eine einzelne Quelle als gerade abgerufen (manueller Abruf). */
export async function markFetched(sourceId: string, db: Queryable = getPool()): Promise<void> {
  await query("UPDATE sources SET last_fetched_at = now() WHERE id = $1", [sourceId], db);
}

export async function startFetchRun(sourceId: string, db: Queryable = getPool()): Promise<string> {
  const row = await queryOne<{ id: string }>(
    "INSERT INTO fetch_runs (source_id) VALUES ($1) RETURNING id",
    [sourceId],
    db,
  );
  return row!.id;
}

export type FetchRunResult = {
  status: Exclude<FetchRunStatus, "running">;
  httpStatus: number | null;
  itemsSeen: number;
  itemsNew: number;
  error: string | null;
};

export async function finishFetchRun(runId: string, result: FetchRunResult, db: Queryable = getPool()): Promise<void> {
  await query(
    `UPDATE fetch_runs
        SET finished_at = now(), status = $2, http_status = $3, items_seen = $4, items_new = $5, error = $6
      WHERE id = $1`,
    [runId, result.status, result.httpStatus, result.itemsSeen, result.itemsNew, result.error],
    db,
  );
}

export async function recordRobots(sourceId: string, allowed: boolean, db: Queryable = getPool()): Promise<void> {
  await query("UPDATE sources SET robots_checked_at = now(), robots_allowed = $2 WHERE id = $1", [sourceId, allowed], db);
}

export async function recordSuccess(
  sourceId: string,
  cache: { etag: string | null; lastModified: string | null },
  db: Queryable = getPool(),
): Promise<void> {
  await query(
    `UPDATE sources
        SET last_success_at = now(), consecutive_failures = 0,
            etag = COALESCE($2, etag), last_modified = COALESCE($3, last_modified)
      WHERE id = $1`,
    [sourceId, cache.etag, cache.lastModified],
    db,
  );
}

export async function recordFailure(sourceId: string, db: Queryable = getPool()): Promise<void> {
  await query("UPDATE sources SET consecutive_failures = consecutive_failures + 1 WHERE id = $1", [sourceId], db);
}

/**
 * Speichert geplante Einträge. Bereits bekannte Links (gleiche Quelle, gleiche
 * normalisierte URL) werden übersprungen. Gibt die Zahl neuer Einträge zurück.
 */
export async function insertRawItems(
  sourceId: string,
  language: string,
  items: readonly PlannedItem[],
  pool: Pool = getPool(),
): Promise<number> {
  if (items.length === 0) return 0;
  return withTransaction(async (client) => {
    let inserted = 0;
    for (const item of items) {
      const result = await client.query(
        `INSERT INTO raw_items
           (source_id, external_guid, url, url_normalized, title, published_at, raw_text,
            content_hash, language, purge_after)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (source_id, url_normalized) DO NOTHING`,
        [
          sourceId,
          item.externalGuid,
          item.url,
          item.urlNormalized,
          item.title,
          item.publishedAt,
          item.rawText,
          item.contentHash,
          language,
          item.purgeAfter,
        ],
      );
      inserted += result.rowCount ?? 0;
    }
    return inserted;
  }, pool);
}

/** Löscht abgelaufene Rohtexte (Fachpresse). Titel und Link bleiben erhalten. */
export async function purgeExpiredRawText(db: Queryable = getPool()): Promise<number> {
  const rows = await query<{ id: string }>(
    `UPDATE raw_items SET raw_text = NULL, purge_after = NULL
      WHERE purge_after IS NOT NULL AND purge_after <= now()
      RETURNING id`,
    [],
    db,
  );
  return rows.length;
}
