import type { Country, FetchMethod, SourceKind, TrustLevel } from "@/config/taxonomy";
import { query, queryOne, type Queryable, getPool } from "./pool";

export type Source = {
  id: string;
  name: string;
  slug: string;
  homepage_url: string | null;
  feed_url: string | null;
  fetch_method: FetchMethod;
  fetch_interval_min: number;
  trust_level: TrustLevel;
  kind: SourceKind;
  country: Country;
  language: string;
  is_active: boolean;
  terms_note: string | null;
  robots_checked_at: Date | null;
  robots_allowed: boolean | null;
  etag: string | null;
  last_modified: string | null;
  last_fetched_at: Date | null;
  last_success_at: Date | null;
  consecutive_failures: number;
  created_at: Date;
  updated_at: Date;
};

export type SourceInput = {
  name: string;
  slug: string;
  homepageUrl: string | null;
  feedUrl: string | null;
  fetchMethod: FetchMethod;
  fetchIntervalMin: number;
  trustLevel: TrustLevel;
  kind: SourceKind;
  country: Country;
  language: string;
  isActive: boolean;
  termsNote: string | null;
};

export type SourceWithStats = Source & { item_count: number; items_last_7d: number };

export async function listSources(db: Queryable = getPool()): Promise<SourceWithStats[]> {
  return query<SourceWithStats>(
    `SELECT s.*,
            COALESCE(c.item_count, 0)::int AS item_count,
            COALESCE(c.items_last_7d, 0)::int AS items_last_7d
       FROM sources s
       LEFT JOIN (
         SELECT source_id,
                count(*) AS item_count,
                count(*) FILTER (WHERE fetched_at > now() - interval '7 days') AS items_last_7d
           FROM raw_items GROUP BY source_id
       ) c ON c.source_id = s.id
      ORDER BY s.is_active DESC, s.trust_level, s.name`,
    [],
    db,
  );
}

export async function getSource(id: string, db: Queryable = getPool()): Promise<Source | null> {
  return queryOne<Source>("SELECT * FROM sources WHERE id = $1", [id], db);
}

const inputColumns = `name, slug, homepage_url, feed_url, fetch_method, fetch_interval_min,
  trust_level, kind, country, language, is_active, terms_note`;

function inputValues(input: SourceInput): unknown[] {
  return [
    input.name,
    input.slug,
    input.homepageUrl,
    input.feedUrl,
    input.fetchMethod,
    input.fetchIntervalMin,
    input.trustLevel,
    input.kind,
    input.country,
    input.language,
    input.isActive,
    input.termsNote,
  ];
}

export async function createSource(input: SourceInput, db: Queryable = getPool()): Promise<Source> {
  const row = await queryOne<Source>(
    `INSERT INTO sources (${inputColumns})
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    inputValues(input),
    db,
  );
  return row!;
}

/** Legt eine Quelle an oder aktualisiert sie anhand des Slugs (für das Seed-Skript). */
export async function upsertSourceBySlug(input: SourceInput, db: Queryable = getPool()): Promise<Source> {
  const row = await queryOne<Source>(
    `INSERT INTO sources (${inputColumns})
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (slug) DO UPDATE SET
       name = EXCLUDED.name, homepage_url = EXCLUDED.homepage_url, feed_url = EXCLUDED.feed_url,
       fetch_method = EXCLUDED.fetch_method, fetch_interval_min = EXCLUDED.fetch_interval_min,
       trust_level = EXCLUDED.trust_level, kind = EXCLUDED.kind, country = EXCLUDED.country,
       language = EXCLUDED.language, terms_note = EXCLUDED.terms_note, updated_at = now()
     RETURNING *`,
    inputValues(input),
    db,
  );
  return row!;
}

export async function updateSource(id: string, input: SourceInput, db: Queryable = getPool()): Promise<Source | null> {
  // Ändert sich die Feed-Adresse, gelten ETag und robots-Prüfung nicht mehr.
  return queryOne<Source>(
    `UPDATE sources SET
       name = $2, slug = $3, homepage_url = $4,
       etag = CASE WHEN feed_url IS DISTINCT FROM $5 THEN NULL ELSE etag END,
       last_modified = CASE WHEN feed_url IS DISTINCT FROM $5 THEN NULL ELSE last_modified END,
       robots_checked_at = CASE WHEN feed_url IS DISTINCT FROM $5 THEN NULL ELSE robots_checked_at END,
       feed_url = $5, fetch_method = $6, fetch_interval_min = $7, trust_level = $8, kind = $9,
       country = $10, language = $11, is_active = $12, terms_note = $13, updated_at = now()
     WHERE id = $1 RETURNING *`,
    [id, ...inputValues(input)],
    db,
  );
}

export async function setSourceActive(id: string, active: boolean, db: Queryable = getPool()): Promise<void> {
  await query("UPDATE sources SET is_active = $2, updated_at = now() WHERE id = $1", [id, active], db);
}

export async function slugExists(slug: string, exceptId: string | null, db: Queryable = getPool()): Promise<boolean> {
  const row = await queryOne<{ exists: boolean }>(
    "SELECT EXISTS (SELECT 1 FROM sources WHERE slug = $1 AND id IS DISTINCT FROM $2) AS exists",
    [slug, exceptId],
    db,
  );
  return row?.exists ?? false;
}
