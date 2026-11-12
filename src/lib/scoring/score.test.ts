import { describe, expect, it } from "vitest";
import { importanceBand, scoreStory, type StoryFacts } from "./score";

/*
 * Testfälle zur Gewichtung (ST-01 bis ST-06). Wer in config/scoring.ts ein
 * Gewicht ändert, passt diese Erwartungen bewusst mit an — ein stillschweigend
 * angepasster Test verdeckt eine Verhaltensänderung.
 */

const today = "2026-11-12";
const base: StoryFacts = {
  affectedness: "direkt",
  obligation: "information",
  deadline: null,
  money: "keins",
  bindingness: "nicht_anwendbar",
  roles: ["zahnarzt", "team"],
  companyNews: false,
  safety: false,
};

describe("scoreStory", () => {
  it("ST-01: Pflicht mit naher Frist für Praxen ist hoch und verlangt Handeln", () => {
    const result = scoreStory(
      { ...base, obligation: "pflicht", deadline: "2027-01-15", bindingness: "in_kraft", money: "sanktion" },
      { trustLevel: "A", today },
    );
    // 45 + 20 + 18 + 15 + 10 + 5 = 113 → 100
    expect(result.importance).toBe(100);
    expect(result.actionLevel).toBe("handeln");
    expect(result.reasons).toEqual([
      "Betrifft Praxen direkt",
      "Pflicht",
      "Frist 15.01.2027",
      "Sanktion möglich",
      "In Kraft",
    ]);
    expect(importanceBand(result.importance)).toBe("hoch");
  });

  it("ST-02: reine Information aus der Presse bleibt niedrig", () => {
    const result = scoreStory(base, { trustLevel: "B", today });
    expect(result.importance).toBe(45);
    expect(result.actionLevel).toBe("keiner");
    expect(importanceBand(result.importance)).toBe("mittel");
  });

  it("ST-03: Gesetzesentwurf wird beobachtet, nicht gehandelt", () => {
    const result = scoreStory({ ...base, affectedness: "indirekt", bindingness: "entwurf", money: "honorar" }, { trustLevel: "A", today });
    // 20 + 12 + 0 + 5 = 37
    expect(result.importance).toBe(37);
    expect(result.actionLevel).toBe("beobachten");
    expect(result.reasons).toContain("Erst Entwurf");
  });

  it("ST-04: Unternehmensmeldung wird abgewertet, ein Rückruf nicht", () => {
    const ad = scoreStory({ ...base, companyNews: true }, { trustLevel: "B", today });
    expect(ad.importance).toBe(25);
    expect(ad.reasons).toContain("Unternehmensmeldung");

    const recall = scoreStory({ ...base, companyNews: true, safety: true }, { trustLevel: "A", today });
    expect(recall.importance).toBe(70);
    expect(recall.actionLevel).toBe("handeln");
    expect(recall.reasons).not.toContain("Unternehmensmeldung");
  });

  it("ST-05: nicht ausdrücklich betroffene Rollen erhalten die Hälfte", () => {
    const result = scoreStory({ ...base, roles: ["praxismanagement"], money: "honorar" }, { trustLevel: "A", today });
    // 45 + 12 + 5 = 62 für Abrechnung, 31 für die Zielgruppe
    expect(result.roleScores.praxismanagement).toBe(62);
    expect(result.roleScores.zahnarzt).toBe(31);
    expect(result.importance).toBe(31);
  });

  it("ST-06: kein Bezug zur Zahnmedizin ergibt 0 und sortiert aus", () => {
    const result = scoreStory({ ...base, affectedness: "keine", obligation: "pflicht" }, { trustLevel: "A", today });
    expect(result.importance).toBe(0);
    expect(result.reasons).toEqual(["Kein Bezug zur Zahnmedizin"]);
  });

  it("ignoriert abgelaufene oder ungültige Fristen", () => {
    const past = scoreStory({ ...base, obligation: "pflicht", deadline: "2026-01-01" }, { trustLevel: "A", today });
    expect(past.reasons.some((r) => r.startsWith("Frist"))).toBe(false);
    expect(past.actionLevel).toBe("keiner");
    const broken = scoreStory({ ...base, deadline: "bald" }, { trustLevel: "A", today });
    expect(broken.importance).toBe(50);
  });

  it("ist deterministisch", () => {
    const facts = { ...base, obligation: "pflicht" as const, deadline: "2027-06-30" };
    expect(scoreStory(facts, { trustLevel: "A", today })).toEqual(scoreStory(facts, { trustLevel: "A", today }));
  });
});
