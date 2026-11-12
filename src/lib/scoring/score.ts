import { importanceThresholds, primaryRoles, scoringWeights as w } from "@/config/scoring";
import {
  roles,
  type ActionLevel,
  type Affectedness,
  type Bindingness,
  type MoneyKind,
  type Obligation,
  type Role,
} from "@/config/taxonomy";

/** Fakten, die die KI je Meldung feststellt. Grundlage jeder Bewertung. */
export type StoryFacts = {
  affectedness: Affectedness;
  obligation: Obligation;
  /** Frist als YYYY-MM-DD oder null. */
  deadline: string | null;
  money: MoneyKind;
  bindingness: Bindingness;
  roles: Role[];
  companyNews: boolean;
  safety: boolean;
};

export type ScoreContext = {
  trustLevel: "A" | "B";
  /** Heutiges Datum (YYYY-MM-DD, deutsche Zeit) — von außen, damit die Rechnung rein bleibt. */
  today: string;
};

export type ScoreResult = {
  /** Wichtigkeit je Rolle, 0–100. */
  roleScores: Record<Role, number>;
  /** Gesamtwichtigkeit: Maximum über die Start-Zielgruppe (SPEC E-14). */
  importance: number;
  actionLevel: ActionLevel;
  /** Kurze Begründung in Worten, z. B. „Pflicht · Frist 31.03.2027“. */
  reasons: string[];
};

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);
}

function formatDeadline(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/**
 * Rechnet aus den Fakten die Wichtigkeit. Rein und deterministisch:
 * gleiche Fakten und gleicher Kontext ergeben immer dasselbe Ergebnis.
 */
export function scoreStory(facts: StoryFacts, ctx: ScoreContext): ScoreResult {
  const reasons: string[] = [];

  if (facts.affectedness === "keine") {
    const zero = Object.fromEntries(roles.map((r) => [r, 0])) as Record<Role, number>;
    return { roleScores: zero, importance: 0, actionLevel: "keiner", reasons: ["Kein Bezug zur Zahnmedizin"] };
  }

  let points = w.base[facts.affectedness];
  reasons.push(facts.affectedness === "direkt" ? "Betrifft Praxen direkt" : "Betrifft Praxen indirekt");

  points += w.obligation[facts.obligation];
  if (facts.obligation === "pflicht") reasons.push("Pflicht");
  if (facts.obligation === "empfehlung") reasons.push("Empfehlung");

  // Nur gültige, noch nicht abgelaufene Fristen zählen.
  const daysLeft =
    facts.deadline !== null && /^\d{4}-\d{2}-\d{2}$/.test(facts.deadline) ? daysBetween(ctx.today, facts.deadline) : null;
  const deadlineUpcoming = daysLeft !== null && !Number.isNaN(daysLeft) && daysLeft >= 0;
  if (deadlineUpcoming) {
    points += daysLeft <= w.deadline.soonDays ? w.deadline.soon : w.deadline.any;
    reasons.push(`Frist ${formatDeadline(facts.deadline!)}`);
  }

  points += w.money[facts.money];
  if (facts.money === "honorar") reasons.push("Honorar/Abrechnung");
  if (facts.money === "kosten") reasons.push("Kosten für die Praxis");
  if (facts.money === "sanktion") reasons.push("Sanktion möglich");

  points += w.bindingness[facts.bindingness];
  if (facts.bindingness === "in_kraft") reasons.push("In Kraft");
  if (facts.bindingness === "beschlossen") reasons.push("Beschlossen");
  if (facts.bindingness === "entwurf") reasons.push("Erst Entwurf");

  if (ctx.trustLevel === "A") points += w.primarySource;

  if (facts.safety) {
    points += w.safety;
    reasons.push("Sicherheit/Rückruf");
  } else if (facts.companyNews) {
    points += w.companyNews;
    reasons.push("Unternehmensmeldung");
  }

  const roleScores = Object.fromEntries(
    roles.map((role) => [role, clamp(facts.roles.includes(role) ? points : points * w.otherRoleFactor)]),
  ) as Record<Role, number>;

  const importance = Math.max(...primaryRoles.map((role) => roleScores[role]));

  let actionLevel: ActionLevel = "keiner";
  if (facts.obligation === "pflicht" && (deadlineUpcoming || facts.bindingness === "in_kraft")) actionLevel = "handeln";
  else if (facts.safety) actionLevel = "handeln";
  else if (facts.obligation === "empfehlung" || facts.bindingness === "entwurf" || facts.bindingness === "beschlossen") {
    actionLevel = "beobachten";
  }

  return { roleScores, importance, actionLevel, reasons };
}

export function importanceBand(importance: number): "hoch" | "mittel" | "niedrig" {
  if (importance >= importanceThresholds.high) return "hoch";
  if (importance >= importanceThresholds.medium) return "mittel";
  return "niedrig";
}
