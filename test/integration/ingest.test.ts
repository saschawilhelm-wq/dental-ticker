import { readFileSync } from "node:fs";
import path from "node:path";
import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { claimDueSources, purgeExpiredRawText } from "@/lib/db/ingest";
import { createSource, getSource, type Source } from "@/lib/db/sources";
import { RobotsCache, runSource, type FetchLike, type IngestDeps } from "@/lib/ingest/run-source";
import { freshDatabase, testDatabaseUrl } from "./db";

const rss = readFileSync(path.join(process.cwd(), "test/fixtures/rss2.xml"), "utf8");

type Route = { status: number; body?: string; headers?: Record<string, string> };

/** Nachgebautes Netz: Antworten je URL, und eine Liste aller Anfragen. */
function fakeNetwork(routes: Record<string, Route | (() => Route)>) {
  const requests: { url: string; headers: Record<string, string> }[] = [];
  const fetch: FetchLike = async (url, init) => {
    requests.push({ url, headers: (init.headers ?? {}) as Record<string, string> });
    const entry = routes[url];
    const route = typeof entry === "function" ? entry() : entry;
    if (!route) return new Response("nicht gefunden", { status: 404 });
    return new Response(route.status === 304 ? null : (route.body ?? ""), { status: route.status, headers: route.headers });
  };
  return { fetch, requests };
}

describe.skipIf(!testDatabaseUrl)("Quellenabruf gegen die Datenbank", () => {
  let pool: Pool;
  let source: Source;

  beforeAll(async () => {
    pool = await freshDatabase();
  });
  afterAll(async () => {
    await pool?.end();
  });
  beforeEach(async () => {
    await pool.query("TRUNCATE sources CASCADE");
    source = await createSource(
      {
        name: "Testbehörde",
        slug: "test",
        homepageUrl: "https://behoerde.example/",
        feedUrl: "https://behoerde.example/feed.xml",
        fetchMethod: "rss",
        fetchIntervalMin: 30,
        trustLevel: "A",
        kind: "primary",
        country: "DE",
        language: "de",
        isActive: true,
        termsNote: null,
      },
      pool,
    );
  });

  const deps = (fetch: FetchLike, now = new Date("2026-11-11T06:00:00Z")): IngestDeps => ({
    pool,
    fetch,
    now: () => now,
    robotsCache: new RobotsCache(),
  });

  it("speichert neue Einträge, merkt sich ETag und protokolliert den Lauf", async () => {
    const net = fakeNetwork({
      "https://behoerde.example/robots.txt": { status: 200, body: "User-agent: *\nDisallow: /intern/\n" },
      "https://behoerde.example/feed.xml": { status: 200, body: rss, headers: { etag: '"v1"', "content-type": "application/rss+xml" } },
    });
    const result = await runSource(source, deps(net.fetch));
    expect(result).toMatchObject({ status: "ok", httpStatus: 200, itemsSeen: 5, itemsNew: 3 });
    expect(result.error).toMatch(/2 Einträge ohne Titel oder Link/);

    const items = await pool.query("SELECT title, url_normalized, raw_text, status FROM raw_items ORDER BY url_normalized");
    expect(items.rows.map((r) => r.url_normalized)).toEqual([
      "https://behoerde.example/beschluesse/101/",
      "https://behoerde.example/beschluesse/102/",
      "https://behoerde.example/beschluesse/103/",
    ]);
    expect(items.rows.every((r) => r.status === "new")).toBe(true);

    const updated = await getSource(source.id, pool);
    expect(updated).toMatchObject({ etag: '"v1"', robots_allowed: true, consecutive_failures: 0 });
    expect(updated?.last_success_at).not.toBeNull();

    const runs = await pool.query("SELECT status, items_new, finished_at FROM fetch_runs");
    expect(runs.rows).toHaveLength(1);
    expect(runs.rows[0]).toMatchObject({ status: "ok", items_new: 3 });
    expect(runs.rows[0].finished_at).not.toBeNull();
  });

  it("speichert beim zweiten Abruf keine Duplikate und sendet bedingte Anfragen", async () => {
    let calls = 0;
    const net = fakeNetwork({
      "https://behoerde.example/feed.xml": () => {
        calls++;
        return calls === 1
          ? { status: 200, body: rss, headers: { etag: '"v1"' } }
          : { status: 200, body: rss.replace("/beschluesse/102/", "/beschluesse/999/"), headers: { etag: '"v2"' } };
      },
    });
    await runSource(source, deps(net.fetch));
    const again = await runSource((await getSource(source.id, pool))!, deps(net.fetch));
    expect(again).toMatchObject({ status: "ok", itemsNew: 1 });

    const feedRequests = net.requests.filter((r) => r.url.endsWith("feed.xml"));
    expect(feedRequests[0].headers["If-None-Match"]).toBeUndefined();
    expect(feedRequests[1].headers["If-None-Match"]).toBe('"v1"');
    expect(feedRequests[1].headers["User-Agent"]).toMatch(/^DentalTickerBot/);

    const count = await pool.query("SELECT count(*)::int AS n FROM raw_items");
    expect(count.rows[0].n).toBe(4);
  });

  it("wertet 304 als Erfolg ohne neue Einträge", async () => {
    const net = fakeNetwork({ "https://behoerde.example/feed.xml": { status: 304 } });
    const result = await runSource(source, deps(net.fetch));
    expect(result).toMatchObject({ status: "not_modified", httpStatus: 304, itemsNew: 0 });
    expect((await getSource(source.id, pool))?.consecutive_failures).toBe(0);
  });

  it("ruft nicht ab, wenn robots.txt den Feed sperrt", async () => {
    const net = fakeNetwork({
      "https://behoerde.example/robots.txt": { status: 200, body: "User-agent: *\nDisallow: /feed.xml\n" },
      "https://behoerde.example/feed.xml": { status: 200, body: rss },
    });
    const result = await runSource(source, deps(net.fetch));
    expect(result.status).toBe("blocked_robots");
    expect(net.requests.map((r) => r.url)).toEqual(["https://behoerde.example/robots.txt"]);
    expect(await getSource(source.id, pool)).toMatchObject({ robots_allowed: false, consecutive_failures: 1 });
  });

  it("protokolliert HTTP-Fehler, kaputte Feeds und Netzwerkfehler und zählt Fehler hoch", async () => {
    const broken = fakeNetwork({ "https://behoerde.example/feed.xml": { status: 503 } });
    expect(await runSource(source, deps(broken.fetch))).toMatchObject({ status: "error", httpStatus: 503, error: "HTTP 503" });

    const html = fakeNetwork({ "https://behoerde.example/feed.xml": { status: 200, body: "<html><body>Wartung</body></html>" } });
    expect((await runSource(source, deps(html.fetch))).error).toMatch(/Unbekanntes Feed-Format/);

    const offline: FetchLike = async (url) => {
      if (url.endsWith("robots.txt")) return new Response("", { status: 404 });
      throw new TypeError("fetch failed");
    };
    expect(await runSource(source, deps(offline))).toMatchObject({ status: "error", error: "fetch failed" });

    expect((await getSource(source.id, pool))?.consecutive_failures).toBe(3);
    const runs = await pool.query("SELECT count(*)::int AS n FROM fetch_runs WHERE status = 'error'");
    expect(runs.rows[0].n).toBe(3);
  });

  it("verwirft zu große Antworten", async () => {
    const huge = "<rss>" + "x".repeat(6 * 1024 * 1024) + "</rss>";
    const net = fakeNetwork({ "https://behoerde.example/feed.xml": { status: 200, body: huge } });
    expect((await runSource(source, deps(net.fetch))).error).toMatch(/größer als/);
  });

  it("reserviert nur fällige, aktive Quellen und verlängert das Intervall nach Fehlern", async () => {
    expect((await claimDueSources(["rss"], 10, pool)).map((s) => s.id)).toEqual([source.id]);
    // Gerade reserviert, also nicht erneut fällig.
    expect(await claimDueSources(["rss"], 10, pool)).toEqual([]);

    // 40 Minuten her: bei 30-Minuten-Intervall fällig …
    await pool.query("UPDATE sources SET last_fetched_at = now() - interval '40 minutes'");
    expect(await claimDueSources(["rss"], 10, pool)).toHaveLength(1);
    // … nach zwei Fehlern (Faktor 4 → 120 Minuten) aber nicht.
    await pool.query("UPDATE sources SET last_fetched_at = now() - interval '40 minutes', consecutive_failures = 2");
    expect(await claimDueSources(["rss"], 10, pool)).toEqual([]);

    await pool.query("UPDATE sources SET last_fetched_at = NULL, consecutive_failures = 0, is_active = false");
    expect(await claimDueSources(["rss"], 10, pool)).toEqual([]);
  });

  it("löscht abgelaufene Rohtexte der Fachpresse, behält Titel und Link", async () => {
    await pool.query("UPDATE sources SET kind = 'press'");
    const press = (await getSource(source.id, pool))!;
    const net = fakeNetwork({ "https://behoerde.example/feed.xml": { status: 200, body: rss } });
    await runSource(press, deps(net.fetch, new Date(Date.now() - 31 * 86_400_000)));
    expect(await purgeExpiredRawText(pool)).toBe(3);
    const rows = await pool.query("SELECT raw_text, title FROM raw_items");
    expect(rows.rows.every((r) => r.raw_text === null && r.title)).toBe(true);
  });
});
