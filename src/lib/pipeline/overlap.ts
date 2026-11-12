/**
 * Prüft, wie viel eines Textes wörtlich aus einem anderen stammt. Grundlage für
 * die Regel „keine wörtlichen Übernahmen aus der Fachpresse“ (SPEC).
 *
 * Gemessen wird der Anteil der 5-Wort-Folgen der Zusammenfassung, die so auch
 * in der Quelle vorkommen. Rein und deterministisch.
 */
export function copyOverlap(summary: string, source: string, n = 5): number {
  const words = (text: string) =>
    text
      .toLocaleLowerCase("de-DE")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter(Boolean);
  const grams = (tokens: string[]) => {
    const out: string[] = [];
    for (let i = 0; i + n <= tokens.length; i++) out.push(tokens.slice(i, i + n).join(" "));
    return out;
  };
  const summaryGrams = grams(words(summary));
  if (summaryGrams.length === 0) return 0;
  const sourceGrams = new Set(grams(words(source)));
  const copied = summaryGrams.filter((g) => sourceGrams.has(g)).length;
  return copied / summaryGrams.length;
}
