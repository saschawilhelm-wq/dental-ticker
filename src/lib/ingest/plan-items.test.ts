import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseFeed } from "./parse-feed";
import { planItems, type PlanOptions } from "./plan-items";

const xml = readFileSync(path.join(__dirname, "../../../test/fixtures/rss2.xml"), "utf8");
const now = new Date("2026-11-11T06:00:00Z");

const options: PlanOptions = {
  feedUrl: "https://behoerde.example/beschluesse/rss.xml",
  sourceKind: "primary",
  now,
  maxItems: 200,
  maxTitleChars: 500,
  maxRawTextChars: 20_000,
  maxFutureSkewHours: 48,
  pressRawTextRetentionDays: 30,
};

describe("planItems", () => {
  const { entries } = parseFeed(xml);

  it("übernimmt gültige Einträge und überspringt solche ohne Titel oder Link", () => {
    const plan = planItems(entries, options);
    expect(plan.items.map((i) => i.urlNormalized)).toEqual([
      "https://behoerde.example/beschluesse/101/",
      "https://behoerde.example/beschluesse/102/",
      "https://behoerde.example/beschluesse/103/",
    ]);
    expect(plan.skipped).toBe(2);
    expect(plan.truncated).toBe(0);
  });

  it("normalisiert Titel und Text, behält die Original-URL", () => {
    const [first, second] = planItems(entries, options).items;
    expect(first.title).toBe("Richtlinie & Änderung: Festzuschüsse für Zahnersatz");
    expect(first.url).toBe("https://behoerde.example/beschluesse/101/?utm_source=rss&utm_medium=feed");
    expect(first.rawText).toBe("Der Beschluss vom 15. Oktober 2026 wurde im Bundesanzeiger veröffentlicht.\nEr tritt am Folgetag in Kraft.");
    expect(first.publishedAt?.toISOString()).toBe("2026-11-10T11:27:34.000Z");
    expect(second.url).toBe("https://behoerde.example/beschluesse/102/");
    expect(second.rawText).toBe("Maskiertes HTML mit ä");
  });

  it("fasst doppelte Links innerhalb eines Feeds zusammen", () => {
    const doubled = [...entries, { ...entries[0], link: entries[0].link + "&utm_campaign=x" }];
    expect(planItems(doubled, options).items).toHaveLength(3);
  });

  it("setzt nur bei Fachpresse ein Löschdatum für den Rohtext", () => {
    expect(planItems(entries, options).items.every((i) => i.purgeAfter === null)).toBe(true);
    const press = planItems(entries, { ...options, sourceKind: "press" }).items;
    expect(press[0].purgeAfter?.toISOString()).toBe("2026-12-11T06:00:00.000Z");
  });

  it("begrenzt die Zahl der Einträge pro Abruf", () => {
    const plan = planItems(entries, { ...options, maxItems: 1 });
    expect(plan.items).toHaveLength(1);
    expect(plan.truncated).toBe(4);
  });

  it("ist deterministisch", () => {
    expect(planItems(entries, options)).toEqual(planItems(entries, options));
  });
});
