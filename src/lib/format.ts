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
