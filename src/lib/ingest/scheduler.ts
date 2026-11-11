import { automatedFetchMethods } from "@/config/taxonomy";
import { ingestConfig } from "@/config/ingest";
import { claimDueSources, purgeExpiredRawText } from "@/lib/db/ingest";
import { runSource, type IngestDeps } from "./run-source";

export type TickSummary = {
  sources: { slug: string; status: string; itemsNew: number; error: string | null }[];
  purged: number;
};

/** Ein Takt des Workers: fällige Quellen abrufen, abgelaufene Rohtexte löschen. */
export async function runTick(deps: IngestDeps): Promise<TickSummary> {
  const due = await claimDueSources(automatedFetchMethods, ingestConfig.sourcesPerTick, deps.pool);
  const sources: TickSummary["sources"] = [];
  for (const source of due) {
    const result = await runSource(source, deps);
    sources.push({ slug: source.slug, status: result.status, itemsNew: result.itemsNew, error: result.error });
  }
  const purged = await purgeExpiredRawText(deps.pool);
  return { sources, purged };
}
