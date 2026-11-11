/** Spielt alle offenen Migrationen aus db/migrations ein: `npm run db:migrate` */
import path from "node:path";
import { closePool, getPool } from "@/lib/db/pool";
import { migrate } from "@/lib/db/migrate";

async function main() {
  const applied = await migrate(getPool(), path.join(process.cwd(), "db", "migrations"));
  console.log(applied.length ? `Angewendet: ${applied.join(", ")}` : "Datenbank ist aktuell.");
}

main()
  .catch((error) => {
    console.error((error as Error).message);
    process.exitCode = 1;
  })
  .finally(closePool);
