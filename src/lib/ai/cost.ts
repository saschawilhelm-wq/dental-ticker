import { aiConfig } from "@/config/ai";

export type TokenUsage = {
  input_tokens: number | null;
  output_tokens: number | null;
  cache_write_tokens: number | null;
  cache_read_tokens: number | null;
};

export type TokenPrices = { input: number; output: number; cacheWrite: number; cacheRead: number };

/** Geschätzte Kosten eines KI-Aufrufs in US-Dollar (Listenpreis). */
export function estimateCostUsd(usage: TokenUsage, prices: TokenPrices = aiConfig.priceUsdPerMTok): number {
  const total =
    (usage.input_tokens ?? 0) * prices.input +
    (usage.output_tokens ?? 0) * prices.output +
    (usage.cache_write_tokens ?? 0) * prices.cacheWrite +
    (usage.cache_read_tokens ?? 0) * prices.cacheRead;
  return total / 1_000_000;
}

/** Gesamte Eingabe eines Aufrufs, ob zwischengespeichert oder nicht. */
export function totalInputTokens(usage: TokenUsage): number {
  return (usage.input_tokens ?? 0) + (usage.cache_write_tokens ?? 0) + (usage.cache_read_tokens ?? 0);
}
