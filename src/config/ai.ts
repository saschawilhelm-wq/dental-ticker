/**
 * Werte für die KI-Pipeline. Die Prompts selbst liegen versioniert unter /prompts.
 * Logik dazu: src/lib/ai und src/lib/pipeline.
 */
export const aiConfig = {
  model: "claude-opus-5-5",
  /**
   * Bei einer Ablehnung durch Sicherheitsfilter beantwortet ein anderes Modell
   * dieselbe Anfrage (serverseitiger Fallback, Beta). Das tatsächlich genutzte
   * Modell wird in ai_runs.model_served gespeichert.
   */
  fallbackBeta: "server-side-fallback-2026-07-01",
  effort: { analyse: "medium", pruefung: "high" },
  maxTokens: { analyse: 8000, pruefung: 6000 },
  promptVersions: { analyse: "analyse.v4", pruefung: "pruefung.v2" },
  /** So viel Rohtext geht höchstens in die Analyse (Zeichen). */
  maxSourceChars: 12_000,
  /**
   * Startpunkt des Tickers (SPEC E-18): Meldungen, die vorher veröffentlicht
   * wurden, sortiert die Pipeline ohne KI-Aufruf aus. Ein festes Datum, kein
   * mitlaufendes Fenster: Neue Meldungen sind immer jünger.
   */
  analyseFrom: "2026-01-01T00:00:00+01:00",
  /** Kostenbremse: Analysen pro Worker-Takt und pro Kalendertag. */
  maxAnalysesPerTick: 5,
  maxAnalysesPerDay: 200,
  /** Nach so vielen Fehlversuchen bleibt ein Eintrag mit Status „Fehler“ liegen. */
  maxAttempts: 3,
  /** Kandidaten für „gleiches Ereignis“: Titelähnlichkeit und Zeitfenster. */
  clustering: { minSimilarity: 0.15, windowDays: 21, maxCandidates: 8 },
  /**
   * Fachpresse: Anteil gleicher Wortfolgen (5 Wörter) zwischen Zusammenfassung
   * und Quelle, ab dem die Meldung zur Prüfung geht (keine Übernahmen, SPEC).
   */
  maxCopyOverlap: 0.2,
  headlineMaxChars: 90,
  /**
   * Listenpreise in US-Dollar pro Million Tokens, nur für die Kostenanzeige.
   * Zwischenspeicher: Schreiben 1,25-fach, Lesen 0,1-fach des Eingabepreises.
   */
  priceUsdPerMTok: { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.4 },
} as const;
