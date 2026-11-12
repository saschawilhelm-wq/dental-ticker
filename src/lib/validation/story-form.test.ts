import { describe, expect, it } from "vitest";
import { agreementRate, parseEditorialForm, parseStoryQuery, storyQueryString } from "./story-form";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
}

const valid = {
  headline: "ePA: Neue Pflichtversion des Konnektors",
  summary: "Die gematik verlangt ein Update für alle Praxen mit TI-Anschluss.",
  wasBedeutetDas: "Update mit dem Dienstleister planen.",
  handlungsbedarf: "handeln",
  frist: "2027-01-31",
  category: "telematik",
};

describe("parseEditorialForm", () => {
  it("übernimmt gültige Eingaben", () => {
    expect(parseEditorialForm(form(valid))).toEqual({ ok: true, value: { ...valid } });
  });

  it("erlaubt eine leere Frist", () => {
    const result = parseEditorialForm(form({ ...valid, frist: "" }));
    expect(result.ok && result.value.frist).toBeNull();
  });

  it("meldet zu lange Überschriften, ungültige Daten und Werte", () => {
    const result = parseEditorialForm(form({ ...valid, headline: "x".repeat(91), frist: "2027-02-30", category: "sonstiges" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.headline).toMatch(/90/);
      expect(result.errors.frist).toMatch(/Datum/);
      expect(result.errors.category).toBe("Bitte einen gültigen Wert wählen.");
    }
  });
});

describe("parseStoryQuery", () => {
  it("ignoriert Unsinn und baut den Query-String zurück", () => {
    expect(parseStoryQuery({ status: "x", kategorie: "y" })).toEqual({ status: undefined, category: undefined, sort: "wichtigkeit" });
    const q = parseStoryQuery({ status: "in_review", kategorie: "abrechnung", sortierung: "neu" });
    expect(storyQueryString(q)).toBe("?status=in_review&kategorie=abrechnung&sortierung=neu");
  });
});

describe("agreementRate", () => {
  it("zählt übereinstimmende Einschätzungen; irrelevant gilt als niedrig", () => {
    expect(agreementRate([])).toEqual({ total: 0, agree: 0, rate: null });
    expect(
      agreementRate([
        { aiBand: "hoch", editorBand: "hoch", editorRelevant: true },
        { aiBand: "mittel", editorBand: "hoch", editorRelevant: true },
        { aiBand: "niedrig", editorBand: "mittel", editorRelevant: false },
        { aiBand: "mittel", editorBand: "mittel", editorRelevant: false },
      ]),
    ).toEqual({ total: 4, agree: 2, rate: 0.5 });
  });
});
