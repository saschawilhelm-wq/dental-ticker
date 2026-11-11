import { rawStatuses, type RawStatus } from "@/config/taxonomy";

type SearchParams = Record<string, string | string[] | undefined>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function single(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  const first = Array.isArray(value) ? value[0] : value;
  const trimmed = first?.trim();
  return trimmed ? trimmed : undefined;
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function isValidDate(value: string): boolean {
  if (!DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export type RawItemQuery = {
  sourceId?: string;
  status?: RawStatus;
  search?: string;
  from?: string;
  to?: string;
  page: number;
};

/**
 * Liest die Filter der Rohdaten-Liste aus der URL. Ungültige Werte werden
 * ignoriert statt eine Fehlerseite zu erzeugen.
 */
export function parseRawItemQuery(params: SearchParams): RawItemQuery {
  const sourceId = single(params, "quelle");
  const status = single(params, "status");
  const search = single(params, "suche");
  const from = single(params, "von");
  const to = single(params, "bis");
  const page = Number.parseInt(single(params, "seite") ?? "1", 10);
  return {
    sourceId: isUuid(sourceId) ? sourceId : undefined,
    status: rawStatuses.includes(status as RawStatus) ? (status as RawStatus) : undefined,
    search: search ? search.slice(0, 200) : undefined,
    from: from && isValidDate(from) ? from : undefined,
    to: to && isValidDate(to) ? to : undefined,
    page: Number.isFinite(page) && page >= 1 && page <= 10_000 ? page : 1,
  };
}

/** Baut die Query-String-Darstellung zurück, z. B. für Blätter-Links. */
export function rawItemQueryString(query: RawItemQuery, overrides: Partial<RawItemQuery> = {}): string {
  const merged = { ...query, ...overrides };
  const params = new URLSearchParams();
  if (merged.sourceId) params.set("quelle", merged.sourceId);
  if (merged.status) params.set("status", merged.status);
  if (merged.search) params.set("suche", merged.search);
  if (merged.from) params.set("von", merged.from);
  if (merged.to) params.set("bis", merged.to);
  if (merged.page > 1) params.set("seite", String(merged.page));
  const text = params.toString();
  return text ? `?${text}` : "";
}

export function parseRunQuery(params: SearchParams): { sourceId?: string; onlyProblems: boolean } {
  const sourceId = single(params, "quelle");
  return { sourceId: isUuid(sourceId) ? sourceId : undefined, onlyProblems: single(params, "nur") === "probleme" };
}
