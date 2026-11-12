import { readFileSync } from "node:fs";
import path from "node:path";
import { categories, categoryHints, roleLabels, roles } from "@/config/taxonomy";
import type { Analysis } from "./schemas";

/** Lädt einen versionierten Prompt aus /prompts, z. B. „analyse.v1“. */
export function loadPrompt(version: string, root = process.cwd()): string {
  if (!/^[a-z]+\.v\d+$/.test(version)) throw new Error(`Ungültige Prompt-Version: ${version}`);
  return readFileSync(path.join(root, "prompts", `${version}.md`), "utf8");
}

/** Systemanweisung der Analyse: fester Text plus Kategorienliste (stabil → gut zwischenspeicherbar). */
export function analysisSystemPrompt(template: string): string {
  const list = categories.map((c) => `- ${c}: ${categoryHints[c]}`).join("\n");
  const roleList = roles.map((r) => `- ${r}: ${roleLabels[r]}`).join("\n");
  return template.replace("{{KATEGORIEN}}", list) + `\nRollen:\n${roleList}\n`;
}

export type AnalysisInput = {
  title: string;
  sourceName: string;
  sourceKind: string;
  trustLevel: string;
  url: string;
  publishedAt: string | null;
  text: string | null;
  candidates: { id: string; headline: string; date: string | null }[];
};

/**
 * Nachricht an die KI für eine Meldung. Quelltext steht in einem eigenen Block,
 * damit Anweisungen im Text der Quelle als Daten erkennbar bleiben.
 */
export function analysisUserMessage(input: AnalysisInput, maxChars: number): string {
  const text = (input.text ?? "").slice(0, maxChars);
  const candidates =
    input.candidates.length === 0
      ? "Keine."
      : input.candidates.map((c) => `- ID ${c.id}: ${c.headline}${c.date ? ` (${c.date})` : ""}`).join("\n");
  return [
    `Quelle: ${input.sourceName} (${input.sourceKind}, Vertrauensstufe ${input.trustLevel})`,
    `Veröffentlicht: ${input.publishedAt ?? "unbekannt"}`,
    `Adresse: ${input.url}`,
    `Titel: ${input.title}`,
    "",
    "<quelltext>",
    text || "(kein Text, nur Titel)",
    "</quelltext>",
    "",
    "Kandidaten für dasselbe Ereignis:",
    candidates,
  ].join("\n");
}

export function checkUserMessage(sourceText: string, title: string, analysis: Analysis, maxChars: number): string {
  const reviewed = {
    headline: analysis.headline,
    summary: analysis.summary,
    was_bedeutet_das: analysis.was_bedeutet_das,
    frist: analysis.frist,
    frist_beschreibung: analysis.frist_beschreibung,
    verpflichtung: analysis.verpflichtung,
    verbindlichkeit: analysis.verbindlichkeit,
    geld: analysis.geld,
    termin: analysis.termin,
  };
  return [
    `Titel der Quelle: ${title}`,
    "",
    "<quelltext>",
    sourceText.slice(0, maxChars) || "(kein Text, nur Titel)",
    "</quelltext>",
    "",
    "<analyse>",
    JSON.stringify(reviewed, null, 2),
    "</analyse>",
  ].join("\n");
}
