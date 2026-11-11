import type { RawStatus } from "@/config/taxonomy";
import { query, queryOne, type Queryable, getPool } from "./pool";

export type RawItemListRow = {
  id: string;
  title: string;
  url: string;
  published_at: Date | null;
  fetched_at: Date;
  status: RawStatus;
  source_id: string;
  source_name: string;
  has_text: boolean;
};

export type RawItemDetail = RawItemListRow & {
  external_guid: string | null;
  url_normalized: string;
  raw_text: string | null;
  content_hash: string;
  language: string | null;
  purge_after: Date | null;
  source_kind: string;
};

export type RawItemFilter = {
  sourceId?: string;
  status?: RawStatus;
  search?: string;
  /** Inklusive, als YYYY-MM-DD in deutscher Zeit. */
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
};

/** Maskiert Platzhalter für ILIKE, damit „50%“ wörtlich gesucht wird. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => "\\" + c);
}

function whereClause(filter: RawItemFilter): { sql: string; params: unknown[] } {
  const parts: string[] = [];
  const params: unknown[] = [];
  const add = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };
  if (filter.sourceId) parts.push(`r.source_id = ${add(filter.sourceId)}`);
  if (filter.status) parts.push(`r.status = ${add(filter.status)}`);
  if (filter.search) parts.push(`r.title ILIKE ${add(`%${escapeLike(filter.search)}%`)}`);
  if (filter.from) parts.push(`r.fetched_at >= (${add(filter.from)}::date AT TIME ZONE 'Europe/Berlin')`);
  if (filter.to) parts.push(`r.fetched_at < ((${add(filter.to)}::date + 1) AT TIME ZONE 'Europe/Berlin')`);
  return { sql: parts.length ? `WHERE ${parts.join(" AND ")}` : "", params };
}

export async function listRawItems(
  filter: RawItemFilter,
  db: Queryable = getPool(),
): Promise<{ rows: RawItemListRow[]; total: number }> {
  const where = whereClause(filter);
  const limit = Math.max(1, Math.min(200, Math.trunc(filter.pageSize)));
  const offset = Math.max(0, Math.trunc(filter.page) - 1) * limit;
  const rows = await query<RawItemListRow>(
    `SELECT r.id, r.title, r.url, r.published_at, r.fetched_at, r.status, r.source_id,
            s.name AS source_name, (r.raw_text IS NOT NULL) AS has_text
       FROM raw_items r JOIN sources s ON s.id = r.source_id
       ${where.sql}
      ORDER BY r.fetched_at DESC, r.published_at DESC NULLS LAST, r.id
      LIMIT ${limit} OFFSET ${offset}`,
    where.params,
    db,
  );
  const count = await queryOne<{ total: number }>(
    `SELECT count(*)::int AS total FROM raw_items r ${where.sql}`,
    where.params,
    db,
  );
  return { rows, total: count?.total ?? 0 };
}

export async function getRawItem(id: string, db: Queryable = getPool()): Promise<RawItemDetail | null> {
  return queryOne<RawItemDetail>(
    `SELECT r.*, s.name AS source_name, s.kind AS source_kind, (r.raw_text IS NOT NULL) AS has_text
       FROM raw_items r JOIN sources s ON s.id = r.source_id
      WHERE r.id = $1`,
    [id],
    db,
  );
}

export async function setRawItemStatus(id: string, status: RawStatus, db: Queryable = getPool()): Promise<void> {
  await query("UPDATE raw_items SET status = $2 WHERE id = $1", [id, status], db);
}

export type Overview = {
  sources_active: number;
  sources_total: number;
  sources_failing: number;
  items_total: number;
  items_today: number;
  runs_last_24h: number;
  errors_last_24h: number;
};

export async function getOverview(db: Queryable = getPool()): Promise<Overview> {
  const row = await queryOne<Overview>(
    `SELECT
       (SELECT count(*) FROM sources WHERE is_active)::int AS sources_active,
       (SELECT count(*) FROM sources)::int AS sources_total,
       (SELECT count(*) FROM sources WHERE is_active AND consecutive_failures > 0)::int AS sources_failing,
       (SELECT count(*) FROM raw_items)::int AS items_total,
       (SELECT count(*) FROM raw_items
         WHERE fetched_at >= (date_trunc('day', now() AT TIME ZONE 'Europe/Berlin') AT TIME ZONE 'Europe/Berlin'))::int AS items_today,
       (SELECT count(*) FROM fetch_runs WHERE started_at > now() - interval '24 hours')::int AS runs_last_24h,
       (SELECT count(*) FROM fetch_runs
         WHERE started_at > now() - interval '24 hours' AND status IN ('error', 'blocked_robots'))::int AS errors_last_24h`,
    [],
    db,
  );
  return row!;
}
