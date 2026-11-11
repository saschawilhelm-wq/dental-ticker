import type { FetchRunStatus } from "@/config/taxonomy";
import { query, type Queryable, getPool } from "./pool";

export type FetchRunRow = {
  id: string;
  source_id: string;
  source_name: string;
  started_at: Date;
  finished_at: Date | null;
  status: FetchRunStatus;
  http_status: number | null;
  items_seen: number;
  items_new: number;
  error: string | null;
};

export async function listFetchRuns(
  filter: { sourceId?: string; onlyProblems?: boolean; limit: number },
  db: Queryable = getPool(),
): Promise<FetchRunRow[]> {
  const parts: string[] = [];
  const params: unknown[] = [];
  if (filter.sourceId) {
    params.push(filter.sourceId);
    parts.push(`f.source_id = $${params.length}`);
  }
  if (filter.onlyProblems) parts.push("f.status IN ('error', 'blocked_robots')");
  params.push(filter.limit);
  return query<FetchRunRow>(
    `SELECT f.*, s.name AS source_name
       FROM fetch_runs f JOIN sources s ON s.id = f.source_id
       ${parts.length ? `WHERE ${parts.join(" AND ")}` : ""}
      ORDER BY f.started_at DESC
      LIMIT $${params.length}`,
    params,
    db,
  );
}
