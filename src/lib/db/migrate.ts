import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Pool } from "pg";

/**
 * Spielt alle noch nicht angewendeten SQL-Dateien aus `dir` in
 * alphabetischer Reihenfolge ein, jede in einer eigenen Transaktion.
 * Gibt die Namen der neu angewendeten Dateien zurück.
 */
export async function migrate(pool: Pool, dir: string): Promise<string[]> {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  const applied = new Set(
    (await pool.query<{ name: string }>("SELECT name FROM schema_migrations")).rows.map((r) => r.name),
  );
  const done: string[] = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(path.join(dir, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      done.push(file);
    } catch (error) {
      await client.query("ROLLBACK");
      throw new Error(`Migration ${file} fehlgeschlagen: ${(error as Error).message}`);
    } finally {
      client.release();
    }
  }
  return done;
}
