/**
 * Vorläufige Werte, die vor dem Livegang bestätigt werden müssen.
 * Solange diese Liste nicht leer ist, ist der Stand nicht livegangsfähig.
 */
export const openConfigItems: readonly { id: string; where: string; what: string }[] = [
  { id: "OC-01", where: "config/scoring.ts", what: "Gewichte und Schwellen der Wichtigkeit: Startvorschlag, Kalibrierung mit ~50 Meldungen steht aus." },
  { id: "OC-02", where: "config/ingest.ts", what: "Löschfrist für Fachpresse-Rohtexte (30 Tage) rechtlich bestätigen." },
  { id: "OC-03", where: "config/ingest.ts", what: "Kennung des Abrufs (userAgent) um eine Projekt-URL ergänzen." },
  { id: "OC-04", where: "lib/auth/mailer.ts", what: "E-Mail-Versand für Login-Links einrichten." },
  { id: "OC-05", where: "config/ai.ts", what: "Kopierschutz-Schwelle für Fachpresse (20 % gleiche Wortfolgen) bestätigen." },
  { id: "OC-06", where: "config/recommendations.ts", what: "Kennzeichnung „Empfehlung in eigener Sache“ rechtlich prüfen." },
];
