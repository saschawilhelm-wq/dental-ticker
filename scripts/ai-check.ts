/**
 * Prüft, ob die KI-Anbindung funktioniert: `npm run ai:check`
 * Schickt eine sehr kleine Anfrage und meldet Modell und Tokenverbrauch.
 */
import { z } from "zod";
import { aiApiKey, ClaudeClient } from "@/lib/ai/client";

async function main() {
  const key = aiApiKey();
  if (!key) {
    console.error("Kein Schlüssel gefunden. Bitte DENTAL_TICKER_ANTHROPIC_API_KEY setzen.");
    process.exitCode = 1;
    return;
  }
  const result = await new ClaudeClient(key).structured({
    schema: z.object({ antwort: z.string() }),
    system: "Antworte knapp auf Deutsch.",
    user: "Sag in drei Wörtern Hallo an das Team einer Zahnarztpraxis.",
    effort: "low",
    maxTokens: 2000,
  });
  if (result.error) {
    console.error(`Fehler: ${result.error}`);
    process.exitCode = 1;
    return;
  }
  console.log(`OK — Modell: ${result.modelServed}, Tokens: ${result.inputTokens} rein / ${result.outputTokens} raus`);
  console.log(`Antwort: ${result.output?.antwort}`);
}

main();
