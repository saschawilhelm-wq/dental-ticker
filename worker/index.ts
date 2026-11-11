/**
 * Abruf-Worker. Läuft als eigener Prozess neben der Web-App:
 *
 *   npm run worker          # dauerhaft, prüft jede Minute auf fällige Quellen
 *   npm run worker -- --once  # genau ein Durchlauf, z. B. für Cron
 */
import { ingestConfig } from "@/config/ingest";
import { closePool, getPool } from "@/lib/db/pool";
import { defaultIngestDeps } from "@/lib/ingest/run-source";
import { runTick } from "@/lib/ingest/scheduler";

const once = process.argv.includes("--once");
let stopping = false;

function log(message: string, data?: unknown) {
  const line = { time: new Date().toISOString(), message, ...(data ? { data } : {}) };
  console.log(JSON.stringify(line));
}

async function tick() {
  try {
    const summary = await runTick(defaultIngestDeps(getPool()));
    if (summary.sources.length > 0 || summary.purged > 0) log("tick", summary);
  } catch (error) {
    log("tick failed", { error: (error as Error).message });
  }
}

async function main() {
  log(once ? "worker: einmaliger Durchlauf" : "worker gestartet", { tickMs: ingestConfig.schedulerTickMs });
  await tick();
  while (!once && !stopping) {
    await new Promise((resolve) => setTimeout(resolve, ingestConfig.schedulerTickMs));
    if (!stopping) await tick();
  }
  await closePool();
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    stopping = true;
    log(`worker: ${signal} empfangen, beende nach aktuellem Durchlauf`);
    if (once) return;
    // Beim Warten nicht bis zum Ende des Intervalls blockieren.
    closePool().finally(() => process.exit(0));
  });
}

main().catch((error) => {
  log("worker abgestürzt", { error: (error as Error).message });
  process.exit(1);
});
