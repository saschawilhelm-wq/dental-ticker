import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { aiConfig } from "@/config/ai";

export type AiCallResult<T> = {
  output: T | null;
  modelServed: string | null;
  stopReason: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  error: string | null;
};

export type StructuredRequest<S extends z.ZodType> = {
  schema: S;
  system: string;
  user: string;
  effort: "low" | "medium" | "high";
  maxTokens: number;
};

/** Schnittstelle zur KI. In Tests wird sie durch eine Attrappe ersetzt. */
export interface AiClient {
  readonly model: string;
  structured<S extends z.ZodType>(request: StructuredRequest<S>): Promise<AiCallResult<z.infer<S>>>;
}

/**
 * Schlüssel für die App. Bewusst ein eigener Variablenname, damit die App
 * nicht versehentlich die Zugangsdaten einer Entwicklungsumgebung übernimmt.
 */
export function aiApiKey(): string | null {
  return process.env.DENTAL_TICKER_ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY ?? null;
}

/** Echte Anbindung über das offizielle SDK. */
export class ClaudeClient implements AiClient {
  readonly model = aiConfig.model;
  private client: Anthropic;

  constructor(apiKey: string) {
    // Feste Adresse: eine in der Umgebung gesetzte ANTHROPIC_BASE_URL gehört
    // nicht zur App und darf ihre Anfragen nicht umleiten.
    this.client = new Anthropic({ apiKey, baseURL: "https://api.anthropic.com", maxRetries: 3 });
  }

  async structured<S extends z.ZodType>(request: StructuredRequest<S>): Promise<AiCallResult<z.infer<S>>> {
    const empty = { output: null, modelServed: null, stopReason: null, inputTokens: null, outputTokens: null };
    try {
      const response = await this.client.beta.messages.parse({
        model: this.model,
        max_tokens: request.maxTokens,
        betas: [aiConfig.fallbackBeta],
        fallbacks: "default",
        output_config: { effort: request.effort, format: betaZodOutputFormat(request.schema) },
        system: [{ type: "text", text: request.system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: request.user }],
      });
      const base = {
        modelServed: response.model,
        stopReason: response.stop_reason,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      };
      if (response.stop_reason === "refusal") {
        return { ...base, output: null, error: `Abgelehnt (${response.stop_details?.category ?? "ohne Kategorie"})` };
      }
      if (response.stop_reason === "max_tokens") {
        return { ...base, output: null, error: "Antwort abgeschnitten (max_tokens)" };
      }
      if (response.parsed_output == null) {
        return { ...base, output: null, error: "Antwort entsprach nicht dem Format" };
      }
      return { ...base, output: response.parsed_output as z.infer<S>, error: null };
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) return { ...empty, error: "API-Schlüssel ungültig" };
      if (error instanceof Anthropic.RateLimitError) return { ...empty, error: "Ratenlimit erreicht" };
      if (error instanceof Anthropic.APIError) return { ...empty, error: `API-Fehler ${error.status ?? ""}: ${error.message}`.slice(0, 500) };
      return { ...empty, error: (error as Error).message.slice(0, 500) };
    }
  }
}
