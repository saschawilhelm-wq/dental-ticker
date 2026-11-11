/**
 * Legt eine Person mit Admin-Rechten an: `npm run admin:create -- name@example.de`
 * Eine Selbstregistrierung gibt es in Phase 1 nicht.
 */
import { closePool } from "@/lib/db/pool";
import { upsertUser } from "@/lib/db/users";
import { isPlausibleEmail, normalizeEmail } from "@/lib/auth/tokens";

async function main() {
  const email = normalizeEmail(process.argv[2] ?? "");
  if (!isPlausibleEmail(email)) {
    console.error("Aufruf: npm run admin:create -- name@example.de");
    process.exitCode = 1;
    return;
  }
  const user = await upsertUser(email, "admin");
  console.log(`Admin angelegt: ${user.email}`);
}

main()
  .catch((error) => {
    console.error((error as Error).message);
    process.exitCode = 1;
  })
  .finally(closePool);
