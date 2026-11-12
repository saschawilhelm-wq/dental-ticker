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
  "gkv_pkv",
  "abrechnung",
  "telematik",
  "hygiene_mp",
  "wissenschaft",
  "praxisfuehrung",
  "markt_industrie",
  "fortbildung",
  "standespolitik",
] as const;
export type Category = (typeof categories)[number];
export const categoryLabels: Record<Category, string> = {
  recht_politik: "Recht & Politik",
  gkv_pkv: "Gesundheitspolitik GKV & PKV",
  abrechnung: "Abrechnung",
  telematik: "Telematik & Digitalisierung",
  hygiene_mp: "Hygiene & Medizinprodukte",
  wissenschaft: "Wissenschaft & Leitlinien",
  praxisfuehrung: "Praxisführung",
  markt_industrie: "Industrie & Handel",
  fortbildung: "Fortbildung & Veranstaltungen",
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

/** Kurzbeschreibung je Kategorie — wird der KI als Einordnungshilfe gegeben. */
export const categoryHints: Record<Category, string> = {
  recht_politik: "Gesetze, Verordnungen, G-BA-Beschlüsse, Datenschutz- und Berufsrecht, soweit nicht GKV/PKV-Finanzierung",
  gkv_pkv: "Gesetzliche und private Krankenversicherung: Finanzierung, Budgetierung, Leistungen, Gesetzesvorhaben dazu",
  abrechnung: "BEMA, GOZ, Punktwerte, Analogberechnung, Urteile zur Abrechnung",
  telematik: "TI, ePA, eRezept, KIM, gematik-Fristen und -Störungen, Sanktionen",
  hygiene_mp: "RKI/KRINKO, Hygiene, Medizinprodukte, Rückrufe, Sicherheitswarnungen, MDR",
  wissenschaft: "Leitlinien (AWMF), Studien, Fachgesellschaften",
  praxisfuehrung: "Personal, Arbeitsrecht, Steuern, Organisation, Fachkräftemangel",
  markt_industrie: "Hersteller, Depots, Großhandel, Dienstleister, Produkte, Übernahmen",
  fortbildung: "Messen, Kongresse, Fortbildungen, Veranstaltungen",
  standespolitik: "BZÄK, KZBV, Kammern, KZVen, Wahlen, Verbandspositionen",
};

export const actionLevels = ["keiner", "beobachten", "handeln"] as const;
export type ActionLevel = (typeof actionLevels)[number];
export const actionLevelLabels: Record<ActionLevel, string> = {
  keiner: "Kein Handlungsbedarf",
  beobachten: "Beobachten",
  handeln: "Handeln",
};

export const certainties = ["offiziell", "berichtet", "unbestaetigt"] as const;
export type Certainty = (typeof certainties)[number];
export const certaintyLabels: Record<Certainty, string> = {
  offiziell: "Offiziell",
  berichtet: "Berichtet",
  unbestaetigt: "Unbestätigt",
};

export const storyStatuses = ["draft", "in_review", "published", "blocked", "archived"] as const;
export type StoryStatus = (typeof storyStatuses)[number];
export const storyStatusLabels: Record<StoryStatus, string> = {
  draft: "In Bearbeitung",
  in_review: "Zur Prüfung",
  published: "Veröffentlicht",
  blocked: "Gesperrt",
  archived: "Archiviert",
};

export const checkStatuses = ["offen", "bestanden", "abweichung"] as const;
export type CheckStatus = (typeof checkStatuses)[number];
export const checkStatusLabels: Record<CheckStatus, string> = {
  offen: "Nicht geprüft",
  bestanden: "KI-Prüfung bestanden",
  abweichung: "Abweichung gefunden",
};

/* Fakten, die die KI je Meldung feststellt (SPEC 1.1). */
export const affectedness = ["direkt", "indirekt", "keine"] as const;
export type Affectedness = (typeof affectedness)[number];
export const obligations = ["pflicht", "empfehlung", "information"] as const;
export type Obligation = (typeof obligations)[number];
export const moneyKinds = ["honorar", "kosten", "sanktion", "keins"] as const;
export type MoneyKind = (typeof moneyKinds)[number];
export const bindingness = ["entwurf", "beschlossen", "in_kraft", "nicht_anwendbar"] as const;
export type Bindingness = (typeof bindingness)[number];
export const bindingnessLabels: Record<Bindingness, string> = {
  entwurf: "Entwurf",
  beschlossen: "Beschlossen",
  in_kraft: "In Kraft",
  nicht_anwendbar: "—",
};
