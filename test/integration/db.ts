import path from "node:path";
import { Pool } from "pg";
import { migrate } from "@/lib/db/migrate";

export const testDatabaseUrl = process.env.TEST_DATABASE_URL;

/**
 * Setzt die Testdatenbank vollständig zurück und spielt alle Migrationen ein.
 * Läuft nur gegen TEST_DATABASE_URL — nie gegen DATABASE_URL.
 */
export async function freshDatabase(): Promise<Pool> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL fehlt.");
  if (url === process.env.DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL darf nicht auf die Arbeitsdatenbank zeigen — die Tests leeren sie.");
  }
  const pool = new Pool({ connectionString: url, max: 4 });
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await migrate(pool, path.join(process.cwd(), "db", "migrations"));
  return pool;
}
