/**
 * Feste Wertelisten und ihre deutschen Beschriftungen.
 * Die Schlüssel entsprechen exakt den Postgres-Enums in db/migrations.
 */

export const roles = ["zahnarzt", "praxismanagement", "team", "labor", "industrie"] as const;
export type Role = (typeof roles)[number];
export const roleLabels: Record<Role, string> = {
  zahnarzt: "Zahnarzt/Zahnärztin",
  praxismanagement: "Praxismanagement / Abrechnung",
  team: "ZFA / ZMF / DH",
  labor: "Zahntechnisches Labor",
  industrie: "Dental-Industrie / Depots / Agenturen",
};

export const categories = [
  "recht_politik",
  "abrechnung",
  "telematik",
  "hygiene_mp",
  "wissenschaft",
  "praxisfuehrung",
  "markt_industrie",
  "standespolitik",
] as const;
export type Category = (typeof categories)[number];
export const categoryLabels: Record<Category, string> = {
  recht_politik: "Recht & Politik",
  abrechnung: "Abrechnung",
  telematik: "Telematik & Digitalisierung",
  hygiene_mp: "Hygiene & Medizinprodukte",
  wissenschaft: "Wissenschaft & Leitlinien",
  praxisfuehrung: "Praxisführung",
  markt_industrie: "Markt & Industrie",
  standespolitik: "Standespolitik",
};

/** AT und CH sind im Datenmodell vorgesehen; zum Start wird nur DE befüllt. */
export const countries = ["DE", "AT", "CH", "EU"] as const;
export type Country = (typeof countries)[number];
export const activeCountries: readonly Country[] = ["DE", "EU"];
export const countryLabels: Record<Country, string> = {
  DE: "Deutschland",
  AT: "Österreich",
  CH: "Schweiz",
  EU: "Europäische Union",
};

export const fetchMethods = ["rss", "api", "html", "manual"] as const;
export type FetchMethod = (typeof fetchMethods)[number];
export const fetchMethodLabels: Record<FetchMethod, string> = {
  rss: "RSS/Atom",
  api: "API",
  html: "HTML (nur mit Erlaubnis)",
  manual: "Manuell",
};
/** Abrufarten, die der Worker in Phase 1 tatsächlich ausführt. */
export const automatedFetchMethods: readonly FetchMethod[] = ["rss"];

export const trustLevels = ["A", "B"] as const;
export type TrustLevel = (typeof trustLevels)[number];
export const trustLevelLabels: Record<TrustLevel, string> = {
  A: "A — Primärquelle",
  B: "B — Fachpresse/Wissenschaft",
};

export const sourceKinds = ["primary", "press", "science"] as const;
export type SourceKind = (typeof sourceKinds)[number];
export const sourceKindLabels: Record<SourceKind, string> = {
  primary: "Primärquelle",
  press: "Fachpresse",
  science: "Wissenschaft",
};

export const rawStatuses = ["new", "clustered", "ignored", "error"] as const;
export type RawStatus = (typeof rawStatuses)[number];
export const rawStatusLabels: Record<RawStatus, string> = {
  new: "Neu",
  clustered: "Gebündelt",
  ignored: "Ignoriert",
  error: "Fehler",
};

export const fetchRunStatuses = ["running", "ok", "not_modified", "blocked_robots", "error"] as const;
export type FetchRunStatus = (typeof fetchRunStatuses)[number];
export const fetchRunStatusLabels: Record<FetchRunStatus, string> = {
  running: "Läuft",
  ok: "Erfolgreich",
  not_modified: "Unverändert",
  blocked_robots: "Durch robots.txt gesperrt",
  error: "Fehler",
};

export const appRoles = ["user", "editor", "admin"] as const;
export type AppRole = (typeof appRoles)[number];
