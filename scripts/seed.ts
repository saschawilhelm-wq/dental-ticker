/**
 * Legt die Startquellen an bzw. aktualisiert ihre Stammdaten: `npm run db:seed`
 * Der Aktiv-Schalter einer bereits vorhandenen Quelle wird nicht überschrieben,
 * damit eine im Admin abgeschaltete Quelle abgeschaltet bleibt.
 */
import { seedSources } from "@/config/seed-sources";
import { closePool } from "@/lib/db/pool";
import { upsertSourceBySlug } from "@/lib/db/sources";

async function main() {
  for (const source of seedSources) {
    const row = await upsertSourceBySlug({
      name: source.name,
      slug: source.slug,
      homepageUrl: source.homepageUrl,
      feedUrl: source.feedUrl,
      fetchMethod: source.fetchMethod,
      fetchIntervalMin: source.fetchIntervalMin,
      trustLevel: source.trustLevel,
      kind: source.kind,
      country: source.country,
      language: source.language,
      isActive: source.isActive,
      termsNote: source.termsNote,
    });
    console.log(`${row.is_active ? "aktiv  " : "inaktiv"}  ${row.slug}`);
  }
}

main()
  .catch((error) => {
    console.error((error as Error).message);
    process.exitCode = 1;
  })
  .finally(closePool);
