import { createHash } from "node:crypto";
import { decode as decodeEntities } from "he";

/** Query-Parameter, die nur der Reichweitenmessung dienen und entfernt werden. */
const TRACKING_PARAM = /^(utm_[a-z_]+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|_hsenc|_hsmi|wt_mc|wt_zmc|pk_campaign|pk_kwd)$/i;

/**
 * Normalisiert eine URL, damit derselbe Artikel nicht zweimal gespeichert wird.
 * Gibt null zurück, wenn die Adresse nicht http(s) ist oder ungültig ist.
 *
 * - relativ → absolut (gegen `base`)
 * - Host klein, Standardport weg, Fragment weg
 * - Tracking-Parameter weg, restliche Parameter sortiert
 */
export function normalizeUrl(raw: string, base?: string): string | null {
  const input = raw.trim();
  if (!input) return null;
  let url: URL;
  try {
    url = new URL(input, base);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  url.hash = "";
  url.username = "";
  url.password = "";
  const kept = [...url.searchParams.entries()].filter(([key]) => !TRACKING_PARAM.test(key));
  kept.sort(([a, av], [b, bv]) => (a === b ? av.localeCompare(bv) : a.localeCompare(b)));
  url.search = "";
  for (const [key, value] of kept) url.searchParams.append(key, value);
  return url.toString();
}

/**
 * Liest ein Datum aus RSS (RFC 822) oder Atom (ISO 8601).
 * Ungültige Werte und Daten weit in der Zukunft ergeben null.
 */
export function parseFeedDate(raw: string | undefined | null, now: Date, maxFutureSkewHours: number): Date | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;
  const date = new Date(value);
  const time = date.getTime();
  if (Number.isNaN(time)) return null;
  if (time > now.getTime() + maxFutureSkewHours * 3_600_000) return null;
  if (date.getUTCFullYear() < 1990) return null;
  return date;
}

/**
 * Wandelt HTML-Fragmente aus Feeds in reinen Text um. Das Ergebnis wird nie als
 * HTML ausgegeben, sondern immer als Text — so kann kein Markup aus einer Quelle
 * in die App gelangen.
 */
export function htmlToText(raw: string | undefined | null, maxChars = Number.POSITIVE_INFINITY): string {
  if (!raw) return "";
  // Manche Feeds liefern HTML als maskierten Text („&lt;p&gt;“). Dann einmal
  // vorab dekodieren, damit die Tags unten erkannt und entfernt werden.
  const source = !/<[a-z!/]/i.test(raw) && /&lt;\/?[a-z!]/i.test(raw) ? decodeEntities(raw) : raw;
  let text = source
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|iframe)\b[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr|blockquote|section|article)\s*>/gi, "\n")
    .replace(/<[^>]*>/g, " ");
  // Zweimal dekodieren fängt doppelt kodierte Feeds ab („&amp;auml;“), ohne neues Markup zu erzeugen,
  // weil Tags vorher entfernt wurden und das Ergebnis nur als Text verwendet wird.
  text = decodeEntities(decodeEntities(text));
  text = text
    .replace(/ /g, " ")
    .replace(/[ \t\f\v\r]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (text.length > maxChars) text = text.slice(0, maxChars).trimEnd() + " …";
  return text;
}

/** Titel: reiner Text in einer Zeile. */
export function normalizeTitle(raw: string | undefined | null, maxChars: number): string {
  return htmlToText(raw, maxChars).replace(/\s+/g, " ").trim();
}

/** Stabiler Fingerabdruck des Inhalts, um geänderte Einträge zu erkennen. */
export function contentHash(title: string, text: string): string {
  return createHash("sha256").update(title).update("\n").update(text).digest("hex");
}
