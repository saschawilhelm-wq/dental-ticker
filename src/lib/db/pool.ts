import { Pool, type PoolClient, type QueryResultRow } from "pg";

/**
 * Eine Verbindung pro Prozess. In der Entwicklung überlebt der Pool das
 * Neuladen von Modulen, sonst würden bei jeder Änderung neue Verbindungen
 * geöffnet.
 */
const globalForPool = globalThis as unknown as { __dentalTickerPool?: Pool };

export function getPool(): Pool {
  if (!globalForPool.__dentalTickerPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL ist nicht gesetzt. Siehe README, Abschnitt „Lokaler Start“.");
    }
    globalForPool.__dentalTickerPool = new Pool({ connectionString, max: 10 });
  }
  return globalForPool.__dentalTickerPool;
}

export type Queryable = Pick<Pool | PoolClient, "query">;

export async function query<T extends QueryResultRow>(
  sql: string,
  params: unknown[] = [],
  db: Queryable = getPool(),
): Promise<T[]> {
  const result = await db.query<T>(sql, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow>(
  sql: string,
  params: unknown[] = [],
  db: Queryable = getPool(),
): Promise<T | null> {
  const rows = await query<T>(sql, params, db);
  return rows[0] ?? null;
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>, pool: Pool = getPool()): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (globalForPool.__dentalTickerPool) {
    await globalForPool.__dentalTickerPool.end();
    globalForPool.__dentalTickerPool = undefined;
  }
}
