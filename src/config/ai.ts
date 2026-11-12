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
  promptVersions: { analyse: "analyse.v1", pruefung: "pruefung.v1" },
  /** So viel Rohtext geht höchstens in die Analyse (Zeichen). */
  maxSourceChars: 12_000,
  /** Kostenbremse: Analysen pro Worker-Takt und pro Kalendertag. */
  maxAnalysesPerTick: 5,
  maxAnalysesPerDay: 200,
  /** Nach so vielen Fehlversuchen bleibt ein Eintrag mit Status „Fehler“ liegen. */
  maxAttempts: 3,
  /** Kandidaten für „gleiches Ereignis“: Titelähnlichkeit und Zeitfenster. */
  clustering: { minSimilarity: 0.3, windowDays: 21, maxCandidates: 5 },
  /**
   * Fachpresse: Anteil gleicher Wortfolgen (5 Wörter) zwischen Zusammenfassung
   * und Quelle, ab dem die Meldung zur Prüfung geht (keine Übernahmen, SPEC).
   */
  maxCopyOverlap: 0.2,
  headlineMaxChars: 90,
} as const;
