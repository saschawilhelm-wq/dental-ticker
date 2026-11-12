import { site } from "@/config/site";

const dateTime = new Intl.DateTimeFormat(site.locale, {
  timeZone: site.timeZone,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dateOnly = new Intl.DateTimeFormat(site.locale, {
  timeZone: site.timeZone,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** „11.11.2026, 07:00“ in deutscher Zeit, oder „—“. */
export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTime.format(date);
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateOnly.format(date);
}

/** Dauer zwischen zwei Zeitpunkten, z. B. „1,4 s“. */
export function formatDuration(start: Date, end: Date | null): string {
  if (!end) return "—";
  const ms = end.getTime() - start.getTime();
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toLocaleString(site.locale, { maximumFractionDigits: 1 })} s`;
}

/** Abrufintervall lesbar: „30 Min.“, „2 Std.“, „1 Tag“. */
export function formatInterval(minutes: number): string {
  if (minutes % 1440 === 0) return minutes === 1440 ? "1 Tag" : `${minutes / 1440} Tage`;
  if (minutes % 60 === 0) return `${minutes / 60} Std.`;
  return `${minutes} Min.`;
}

export function hostOf(url: string | null): string {
  if (!url) return "—";
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

const weekdayDate = new Intl.DateTimeFormat(site.locale, {
  timeZone: site.timeZone,
  weekday: "long",
  day: "numeric",
  month: "long",
});

const longDate = new Intl.DateTimeFormat(site.locale, {
  timeZone: site.timeZone,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const timeOnly = new Intl.DateTimeFormat(site.locale, {
  timeZone: site.timeZone,
  hour: "2-digit",
  minute: "2-digit",
});

const dayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: site.timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Kalendertag in deutscher Zeit als „2026-11-12“ — Grundlage für die Tagesgruppen. */
export function dayKey(date: Date): string {
  return dayKeyFormat.format(date);
}

/** „Donnerstag, 12. November 2026“ */
export function formatLongDate(date: Date): string {
  return longDate.format(date);
}

/** „07:05“ in deutscher Zeit. */
export function formatTime(value: Date | null | undefined): string {
  return value ? timeOnly.format(value) : "—";
}

/** Überschrift einer Tagesgruppe: „Heute“, „Gestern“ oder „Montag, 9. November“. */
export function formatDayHeading(date: Date, now: Date): string {
  const key = dayKey(date);
  if (key === dayKey(now)) return "Heute";
  if (key === dayKey(new Date(now.getTime() - 86_400_000))) return "Gestern";
  return weekdayDate.format(date);
}

/** „vor 5 Min.“, „vor 3 Std.“, „vor 2 Tagen“ — für Statusangaben. */
export function formatRelative(value: Date | null | undefined, now: Date): string {
  if (!value) return "noch nie";
  const minutes = Math.round((now.getTime() - value.getTime()) / 60_000);
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.round(hours / 24);
  return days === 1 ? "vor 1 Tag" : `vor ${days} Tagen`;
}

/** Gruppiert Einträge nach Kalendertag, Reihenfolge bleibt erhalten. */
export function groupByDay<T>(items: readonly T[], dateOf: (item: T) => Date): { key: string; date: Date; items: T[] }[] {
  const groups: { key: string; date: Date; items: T[] }[] = [];
  for (const item of items) {
    const date = dateOf(item);
    const key = dayKey(date);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, date, items: [item] });
  }
  return groups;
}

/** Organisationsteil eines Quellennamens: „G-BA — Beschlüsse“ → „G-BA“. */
function organisationOf(name: string): string {
  return name.split(/\s+[—–]\s+/)[0].trim();
}

/** Zweibuchstabiges Kürzel: „G-BA“ → „GB“, „gematik“ → „GE“. */
export function sourceMonogram(name: string): string {
  const words = organisationOf(name).split(/[\s\-/]+/).filter(Boolean);
  const letters = words.length >= 2 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2);
  return letters.toLocaleUpperCase("de-DE");
}

/** Fester Farbton 1–5 je Organisation, damit Quellen derselben Stelle gleich aussehen. */
export function sourceTint(name: string): 1 | 2 | 3 | 4 | 5 {
  let hash = 0;
  for (const char of organisationOf(name).toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return ((hash % 5) + 1) as 1 | 2 | 3 | 4 | 5;
}
