import type { Bindingness, MoneyKind, Obligation, Role } from "./taxonomy";

/**
 * Gewichte für die Wichtigkeit einer Meldung (SPEC 1.1).
 *
 * VORLÄUFIG: Diese Zahlen sind ein Startvorschlag und werden mit dem
 * Auftraggeber und anhand der Kalibrierung (Redaktion bewertet ~50 Meldungen)
 * festgelegt. Siehe config-status.ts.
 *
 * Die Rechnung selbst liegt in src/lib/scoring/score.ts. Wer hier ein Gewicht
 * ändert, muss die Testfälle in score.test.ts bewusst mit anpassen.
 */
export const scoringWeights = {
  /** Ausgangswert nach Betroffenheit. „keine“ führt zum Aussortieren. */
  base: { direkt: 45, indirekt: 20 },
  obligation: { pflicht: 20, empfehlung: 8, information: 0 } satisfies Record<Obligation, number>,
  /** Frist innerhalb von `soonDays` Tagen zählt stärker. */
  deadline: { any: 8, soon: 18, soonDays: 90 },
  money: { honorar: 12, kosten: 8, sanktion: 15, keins: 0 } satisfies Record<MoneyKind, number>,
  bindingness: { entwurf: 0, beschlossen: 6, in_kraft: 10, nicht_anwendbar: 0 } satisfies Record<Bindingness, number>,
  /** Primärquelle (Vertrauensstufe A). */
  primarySource: 5,
  /** Rückruf, Sicherheitswarnung, Lieferengpass. */
  safety: 20,
  /** Reine Unternehmens- oder Produktmeldung (außer Sicherheit). */
  companyNews: -20,
  /** Anteil für Rollen, die laut KI nicht ausdrücklich betroffen sind. */
  otherRoleFactor: 0.5,
} as const;

/**
 * Zielgruppe zum Start (SPEC E-14): Diese Rollen bestimmen die Gesamtwichtigkeit.
 * Abrechnung erscheint als Hinweis, nicht als Schwerpunkt.
 */
export const primaryRoles: readonly Role[] = ["zahnarzt", "team"];

/** Ab dieser Gesamtwichtigkeit gilt eine Meldung als „wichtig“ (z. B. für Push in Phase 3). */
export const importanceThresholds = { high: 70, medium: 40 } as const;
