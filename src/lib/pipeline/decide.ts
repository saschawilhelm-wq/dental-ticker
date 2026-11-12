import { aiConfig } from "@/config/ai";
import type { SourceKind, StoryStatus } from "@/config/taxonomy";
import type { Analysis, CheckResult } from "@/lib/ai/schemas";
import type { StoryFacts } from "@/lib/scoring/score";

export type Issue = { feld: string; aussage: string; problem: string };

/** Fakten aus der KI-Analyse in die Form der Bewertung übertragen. Rein. */
export function factsFromAnalysis(a: Analysis): StoryFacts {
  return {
    affectedness: a.betroffenheit,
    obligation: a.verpflichtung,
    deadline: a.frist,
    money: a.geld,
    bindingness: a.verbindlichkeit,
    roles: [...new Set(a.rollen)],
    companyNews: a.unternehmensmeldung,
    safety: a.sicherheit_rueckruf,
  };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Datum nur übernehmen, wenn es ein echtes Kalenderdatum ist. */
export function cleanIsoDate(value: string | null): string | null {
  if (!value || !ISO_DATE.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value) ? value : null;
}

/**
 * Entscheidet, ob eine Meldung direkt erscheint oder in die Review-Warteschlange
 * geht (SPEC E-03). Rein und deterministisch.
 *
 * Direkt veröffentlicht wird nur, wenn die KI-Prüfung bestanden ist und keine
 * der automatischen Prüfungen anschlägt.
 */
export function decidePublication(input: {
  analysis: Analysis;
  check: CheckResult | null;
  checkError: string | null;
  sourceKind: SourceKind;
  copyOverlap: number;
}): { status: Extract<StoryStatus, "published" | "in_review">; aiChecked: boolean; issues: Issue[] } {
  const issues: Issue[] = [];

  if (input.check === null) {
    issues.push({ feld: "fakten", aussage: "—", problem: `KI-Prüfung nicht durchgeführt: ${input.checkError ?? "unbekannter Fehler"}` });
  } else if (input.check.ergebnis === "abweichung" || input.check.probleme.length > 0) {
    issues.push(...input.check.probleme);
    if (input.check.probleme.length === 0) {
      issues.push({ feld: "fakten", aussage: "—", problem: "KI-Prüfung meldet eine Abweichung ohne Einzelheiten." });
    }
  }

  if (input.analysis.headline.length > aiConfig.headlineMaxChars) {
    issues.push({
      feld: "headline",
      aussage: input.analysis.headline,
      problem: `Überschrift hat ${input.analysis.headline.length} Zeichen (höchstens ${aiConfig.headlineMaxChars}).`,
    });
  }

  if (input.analysis.frist !== null && cleanIsoDate(input.analysis.frist) === null) {
    issues.push({ feld: "frist", aussage: input.analysis.frist, problem: "Frist ist kein gültiges Datum." });
  }

  if (input.sourceKind === "press" && input.copyOverlap > aiConfig.maxCopyOverlap) {
    issues.push({
      feld: "summary",
      aussage: input.analysis.summary,
      problem: `${Math.round(input.copyOverlap * 100)} % der Zusammenfassung stimmen wörtlich mit der Fachpresse überein.`,
    });
  }

  const passed = issues.length === 0;
  return { status: passed ? "published" : "in_review", aiChecked: input.check !== null && passed, issues };
}
