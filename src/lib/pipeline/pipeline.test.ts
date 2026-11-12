import { describe, expect, it } from "vitest";
import { analysisSystemPrompt, analysisUserMessage, checkUserMessage, loadPrompt } from "@/lib/ai/prompts";
import type { Analysis } from "@/lib/ai/schemas";
import { cleanIsoDate, decidePublication, factsFromAnalysis } from "./decide";
import { copyOverlap } from "./overlap";

export const sampleAnalysis: Analysis = {
  betroffenheit: "direkt",
  betroffenheit_begruendung: "Betrifft alle Zahnarztpraxen mit TI-Anschluss.",
  headline: "ePA: Neue Pflichtversion des Konnektors bis Ende Januar",
  summary: "Die gematik verlangt ein Update. Praxen müssen es einspielen. Andernfalls drohen Kürzungen.",
  was_bedeutet_das: "Praxen sollten das Update mit ihrem Dienstleister einplanen.",
  kategorie: "telematik",
  verpflichtung: "pflicht",
  frist: "2027-01-31",
  frist_beschreibung: "Update einspielen",
  geld: "sanktion",
  verbindlichkeit: "in_kraft",
  rollen: ["zahnarzt", "team", "team"],
  unternehmensmeldung: false,
  sicherheit_rueckruf: false,
  termin: null,
  sicherheit: "offiziell",
  gleiches_ereignis_wie: null,
};

describe("decidePublication", () => {
  it("veröffentlicht bei bestandener Prüfung", () => {
    const decision = decidePublication({
      analysis: sampleAnalysis,
      check: { ergebnis: "bestanden", probleme: [] },
      checkError: null,
      sourceKind: "primary",
      copyOverlap: 0,
    });
    expect(decision).toEqual({ status: "published", aiChecked: true, issues: [] });
  });

  it("schickt Abweichungen der Prüfung in die Warteschlange", () => {
    const decision = decidePublication({
      analysis: sampleAnalysis,
      check: { ergebnis: "abweichung", probleme: [{ feld: "frist", aussage: "31.01.2027", problem: "Quelle nennt 31.03." }] },
      checkError: null,
      sourceKind: "primary",
      copyOverlap: 0,
    });
    expect(decision.status).toBe("in_review");
    expect(decision.aiChecked).toBe(false);
    expect(decision.issues).toHaveLength(1);
  });

  it("veröffentlicht nie ohne Prüfung", () => {
    const decision = decidePublication({ analysis: sampleAnalysis, check: null, checkError: "Ratenlimit erreicht", sourceKind: "primary", copyOverlap: 0 });
    expect(decision.status).toBe("in_review");
    expect(decision.issues[0].problem).toMatch(/Ratenlimit/);
  });

  it("prüft Überschriftlänge, Fristformat und Übernahmen aus der Fachpresse", () => {
    const decision = decidePublication({
      analysis: { ...sampleAnalysis, headline: "x".repeat(91), frist: "31.01.2027" },
      check: { ergebnis: "bestanden", probleme: [] },
      checkError: null,
      sourceKind: "press",
      copyOverlap: 0.5,
    });
    expect(decision.status).toBe("in_review");
    expect(decision.issues.map((i) => i.feld)).toEqual(["headline", "frist", "summary"]);
  });

  it("lässt Übernahmen aus Primärquellen zu (amtlicher Text)", () => {
    const decision = decidePublication({
      analysis: sampleAnalysis,
      check: { ergebnis: "bestanden", probleme: [] },
      checkError: null,
      sourceKind: "primary",
      copyOverlap: 0.9,
    });
    expect(decision.status).toBe("published");
  });
});

describe("factsFromAnalysis und cleanIsoDate", () => {
  it("überträgt Fakten und entfernt doppelte Rollen", () => {
    expect(factsFromAnalysis(sampleAnalysis)).toEqual({
      affectedness: "direkt",
      obligation: "pflicht",
      deadline: "2027-01-31",
      money: "sanktion",
      bindingness: "in_kraft",
      roles: ["zahnarzt", "team"],
      companyNews: false,
      safety: false,
    });
  });

  it("akzeptiert nur echte Kalenderdaten", () => {
    expect(cleanIsoDate("2027-01-31")).toBe("2027-01-31");
    expect(cleanIsoDate("2027-02-30")).toBeNull();
    expect(cleanIsoDate("31.01.2027")).toBeNull();
    expect(cleanIsoDate(null)).toBeNull();
  });
});

describe("copyOverlap", () => {
  const source = "Der Gemeinsame Bundesausschuss hat heute beschlossen, die Richtlinie zur Zahnersatzversorgung zu ändern.";

  it("erkennt wörtliche Übernahmen", () => {
    expect(copyOverlap("Der Gemeinsame Bundesausschuss hat heute beschlossen, die Richtlinie zu ändern.", source)).toBeGreaterThan(0.4);
  });

  it("lässt eigene Formulierungen durch", () => {
    expect(copyOverlap("Der G-BA passt die Regeln für Zahnersatz an; Praxen müssen vorerst nichts tun.", source)).toBe(0);
  });

  it("ignoriert Groß- und Kleinschreibung sowie Satzzeichen", () => {
    expect(copyOverlap("DER gemeinsame Bundesausschuss, hat heute beschlossen!", source)).toBe(1);
  });
});

describe("Prompts", () => {
  it("lädt versionierte Prompts und setzt die Kategorien ein", () => {
    const system = analysisSystemPrompt(loadPrompt("analyse.v1"));
    expect(system).toContain("- gkv_pkv: Gesetzliche und private Krankenversicherung");
    expect(system).not.toContain("{{KATEGORIEN}}");
    expect(loadPrompt("pruefung.v1")).toContain("Prüfe jede Aussage");
  });

  it("verweigert Pfade außerhalb von /prompts", () => {
    expect(() => loadPrompt("../package")).toThrow(/Ungültige Prompt-Version/);
  });

  it("trennt Quelltext als Daten ab und kürzt ihn", () => {
    const message = analysisUserMessage(
      {
        title: "Titel",
        sourceName: "G-BA",
        sourceKind: "primary",
        trustLevel: "A",
        url: "https://g-ba.de/1",
        publishedAt: "2026-11-10",
        text: "a".repeat(50),
        candidates: [{ id: "abc", headline: "Ähnlich", date: "2026-11-09" }],
      },
      10,
    );
    expect(message).toContain("<quelltext>\naaaaaaaaaa\n</quelltext>");
    expect(message).toContain("- ID abc: Ähnlich (2026-11-09)");
    expect(checkUserMessage("Quelle", "Titel", sampleAnalysis, 100)).toContain('"frist": "2027-01-31"');
  });
});
