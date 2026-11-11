/** Werte für den Quellenabruf. Logik dazu liegt in src/lib/ingest. */
export const ingestConfig = {
  /**
   * Kennung, mit der sich der Abruf bei den Quellen meldet. Enthält bewusst
   * keine personenbezogene Kontaktadresse. Vor Livegang durch eine
   * Projekt-URL ergänzen (siehe README, „Offene Punkte“).
   */
  userAgent: "DentalTickerBot/0.1",
  /** Kennung, gegen die robots.txt-Regeln geprüft werden. */
  robotsAgent: "DentalTickerBot",
  requestTimeoutMs: 20_000,
  /** Größere Antworten werden verworfen. */
  maxFeedBytes: 5 * 1024 * 1024,
  /** Pro Abruf werden höchstens so viele Einträge übernommen. */
  maxItemsPerFeed: 200,
  /** Maximale Länge des gespeicherten Rohtexts in Zeichen. */
  maxRawTextChars: 20_000,
  maxTitleChars: 500,
  /** Wie lange ein robots.txt-Ergebnis zwischengespeichert wird. */
  robotsCacheHours: 12,
  /**
   * Rohtexte aus der Fachpresse werden nach dieser Frist gelöscht. Vorläufiger
   * Wert — rechtlich prüfen lassen (§ 44b UrhG, Nutzungsbedingungen).
   */
  pressRawTextRetentionDays: 30,
  /** Takt, in dem der Worker nach fälligen Quellen schaut. */
  schedulerTickMs: 60_000,
  /** Höchstens so viele Quellen pro Takt. */
  sourcesPerTick: 10,
  /** Veröffentlichungsdaten weiter als so in der Zukunft gelten als ungültig. */
  maxFutureSkewHours: 48,
} as const;
