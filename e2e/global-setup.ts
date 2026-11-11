import { loadEnv } from "vite";
import { freshDatabase } from "../test/integration/db";

/** Testdatenbank einmal vor allen Tests zurücksetzen und migrieren. */
export default async function globalSetup() {
  Object.assign(process.env, loadEnv("test", process.cwd(), ""));
  const pool = await freshDatabase();
  await pool.end();
}
