import { contentHash, htmlToText, normalizeTitle, normalizeUrl, parseFeedDate } from "./normalize";
import type { FeedEntry } from "./parse-feed";
import type { SourceKind } from "@/config/taxonomy";

export type PlannedItem = {
  externalGuid: string | null;
  url: string;
  urlNormalized: string;
  title: string;
  publishedAt: Date | null;
  rawText: string | null;
  contentHash: string;
  purgeAfter: Date | null;
};

export type PlanOptions = {
  feedUrl: string;
  sourceKind: SourceKind;
  now: Date;
  maxItems: number;
  maxTitleChars: number;
  maxRawTextChars: number;
  maxFutureSkewHours: number;
  pressRawTextRetentionDays: number;
};

export type PlanResult = {
  items: PlannedItem[];
  /** Einträge ohne verwertbaren Link oder Titel. */
  skipped: number;
  /** Einträge jenseits von `maxItems`, die bewusst nicht übernommen wurden. */
  truncated: number;
};

/**
 * Wandelt Feed-Einträge in speicherfertige Zeilen um. Rein und deterministisch:
 * gleiche Eingabe und gleiches `now` ergeben dasselbe Ergebnis.
 *
 * Doppelte Links innerhalb desselben Feeds werden hier schon zusammengefasst;
 * gegen bereits gespeicherte Einträge prüft die Datenbank (UNIQUE-Schlüssel).
 */
export function planItems(entries: readonly FeedEntry[], options: PlanOptions): PlanResult {
  const seen = new Set<string>();
  const items: PlannedItem[] = [];
  let skipped = 0;

  for (const entry of entries.slice(0, options.maxItems)) {
    const title = normalizeTitle(entry.title, options.maxTitleChars);
    // Eine GUID taugt nur als Link, wenn sie selbst eine absolute Adresse ist —
    // sonst würde aus „intern-105“ eine erfundene URL relativ zum Feed.
    const candidate = entry.link ?? (entry.guid && /^https?:\/\//i.test(entry.guid) ? entry.guid : null);
    const urlNormalized = candidate ? normalizeUrl(candidate, options.feedUrl) : null;
    if (!title || !urlNormalized) {
      skipped++;
      continue;
    }
    if (seen.has(urlNormalized)) continue;
    seen.add(urlNormalized);

    const text = htmlToText(entry.body, options.maxRawTextChars);
    const isPress = options.sourceKind === "press";
    items.push({
      externalGuid: entry.guid,
      url: new URL(candidate!.trim(), options.feedUrl).toString(),
      urlNormalized,
      title,
      publishedAt: parseFeedDate(entry.published, options.now, options.maxFutureSkewHours),
      rawText: text || null,
      contentHash: contentHash(title, text),
      purgeAfter: isPress
        ? new Date(options.now.getTime() + options.pressRawTextRetentionDays * 86_400_000)
        : null,
    });
  }

  return { items, skipped, truncated: Math.max(0, entries.length - options.maxItems) };
}
