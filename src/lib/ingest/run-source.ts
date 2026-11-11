import type { Pool } from "pg";
import { ingestConfig } from "@/config/ingest";
import {
  finishFetchRun,
  insertRawItems,
  recordFailure,
  recordRobots,
  recordSuccess,
  startFetchRun,
  type FetchRunResult,
} from "@/lib/db/ingest";
import type { Source } from "@/lib/db/sources";
import { decodeFeed } from "./decode";
import { parseFeed } from "./parse-feed";
import { planItems } from "./plan-items";
import { evaluateRobots, robotsUrlFor } from "./robots";

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

type RobotsEntry = { status: number | null; body: string; expiresAt: number };

/** Zwischenspeicher für robots.txt je Host, damit sie nicht bei jedem Abruf neu geladen wird. */
export class RobotsCache {
  private entries = new Map<string, RobotsEntry>();
  get(url: string, now: number): RobotsEntry | null {
    const entry = this.entries.get(url);
    return entry && entry.expiresAt > now ? entry : null;
  }
  set(url: string, entry: RobotsEntry): void {
    this.entries.set(url, entry);
  }
}

export type IngestDeps = {
  pool: Pool;
  fetch: FetchLike;
  now: () => Date;
  robotsCache: RobotsCache;
};

export function defaultIngestDeps(pool: Pool): IngestDeps {
  return { pool, fetch: (url, init) => fetch(url, init), now: () => new Date(), robotsCache: sharedRobotsCache };
}

const sharedRobotsCache = new RobotsCache();

class ResponseTooLargeError extends Error {}

/** Liest einen Antwortkörper bis zur Größengrenze. */
async function readLimited(response: Response, maxBytes: number): Promise<Uint8Array> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new ResponseTooLargeError(`Antwort zu groß (${declared} Bytes).`);
  }
  if (!response.body) return new Uint8Array(await response.arrayBuffer());
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new ResponseTooLargeError(`Antwort größer als ${maxBytes} Bytes.`);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function requestInit(extraHeaders: Record<string, string> = {}): RequestInit {
  return {
    redirect: "follow",
    signal: AbortSignal.timeout(ingestConfig.requestTimeoutMs),
    headers: { "User-Agent": ingestConfig.userAgent, ...extraHeaders },
  };
}

async function robotsAllows(feedUrl: string, deps: IngestDeps): Promise<boolean> {
  const robotsUrl = robotsUrlFor(feedUrl);
  const nowMs = deps.now().getTime();
  let entry = deps.robotsCache.get(robotsUrl, nowMs);
  if (!entry) {
    let status: number | null = null;
    let body = "";
    try {
      const response = await deps.fetch(robotsUrl, requestInit({ Accept: "text/plain,*/*;q=0.1" }));
      status = response.status;
      if (response.ok) body = new TextDecoder().decode(await readLimited(response, 512 * 1024));
    } catch {
      status = null;
    }
    entry = { status, body, expiresAt: nowMs + ingestConfig.robotsCacheHours * 3_600_000 };
    deps.robotsCache.set(robotsUrl, entry);
  }
  return evaluateRobots(robotsUrl, entry.status, entry.body, feedUrl, ingestConfig.robotsAgent).allowed;
}

/**
 * Ruft eine Quelle einmal ab und protokolliert das Ergebnis in `fetch_runs`.
 * Wirft nie: Fehler landen im Protokoll und im Fehlerzähler der Quelle.
 */
export async function runSource(source: Source, deps: IngestDeps): Promise<FetchRunResult> {
  const runId = await startFetchRun(source.id, deps.pool);
  const result = await fetchAndStore(source, deps);
  await finishFetchRun(runId, result, deps.pool);
  // Erfolge hat fetchAndStore samt Cache-Headern schon vermerkt.
  if (result.status !== "ok" && result.status !== "not_modified") {
    await recordFailure(source.id, deps.pool);
  }
  return result;
}

function describeSkips(skipped: number, truncated: number): string | null {
  const notes: string[] = [];
  if (skipped > 0) notes.push(`${skipped} Einträge ohne Titel oder Link übersprungen.`);
  if (truncated > 0) notes.push(`Feed enthält ${truncated} weitere Einträge über der Grenze von ${ingestConfig.maxItemsPerFeed}.`);
  return notes.length ? notes.join(" ") : null;
}

async function fetchAndStore(source: Source, deps: IngestDeps): Promise<FetchRunResult> {
  const base = { httpStatus: null, itemsSeen: 0, itemsNew: 0, error: null };
  if (!source.feed_url) return { ...base, status: "error", error: "Keine Feed-Adresse hinterlegt." };

  try {
    const allowed = await robotsAllows(source.feed_url, deps);
    await recordRobots(source.id, allowed, deps.pool);
    if (!allowed) {
      return { ...base, status: "blocked_robots", error: "robots.txt untersagt den Abruf dieser Adresse." };
    }

    const conditional: Record<string, string> = {
      Accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.1",
    };
    if (source.etag) conditional["If-None-Match"] = source.etag;
    if (source.last_modified) conditional["If-Modified-Since"] = source.last_modified;

    const response = await deps.fetch(source.feed_url, requestInit(conditional));
    if (response.status === 304) {
      await recordSuccess(source.id, { etag: null, lastModified: null }, deps.pool);
      return { ...base, status: "not_modified", httpStatus: 304 };
    }
    if (!response.ok) {
      return { ...base, status: "error", httpStatus: response.status, error: `HTTP ${response.status}` };
    }

    const bytes = await readLimited(response, ingestConfig.maxFeedBytes);
    const feed = parseFeed(decodeFeed(bytes, response.headers.get("content-type")));
    const plan = planItems(feed.entries, {
      feedUrl: response.url || source.feed_url,
      sourceKind: source.kind,
      now: deps.now(),
      maxItems: ingestConfig.maxItemsPerFeed,
      maxTitleChars: ingestConfig.maxTitleChars,
      maxRawTextChars: ingestConfig.maxRawTextChars,
      maxFutureSkewHours: ingestConfig.maxFutureSkewHours,
      pressRawTextRetentionDays: ingestConfig.pressRawTextRetentionDays,
    });
    const itemsNew = await insertRawItems(source.id, source.language, plan.items, deps.pool);
    await recordSuccess(
      source.id,
      { etag: response.headers.get("etag"), lastModified: response.headers.get("last-modified") },
      deps.pool,
    );
    return {
      status: "ok",
      httpStatus: response.status,
      itemsSeen: feed.entries.length,
      itemsNew,
      error: describeSkips(plan.skipped, plan.truncated),
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.name === "TimeoutError"
          ? `Zeitüberschreitung nach ${ingestConfig.requestTimeoutMs / 1000} s.`
          : error.message
        : String(error);
    return { ...base, status: "error", error: message.slice(0, 1000) };
  }
}
