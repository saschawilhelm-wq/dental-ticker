import { describe, expect, it } from "vitest";
import { estimateCostUsd, totalInputTokens } from "./cost";

const prices = { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.4 };

describe("estimateCostUsd", () => {
  it("rechnet alle vier Token-Arten ein", () => {
    const usage = { input_tokens: 1_000_000, output_tokens: 1_000_000, cache_write_tokens: 1_000_000, cache_read_tokens: 1_000_000 };
    expect(estimateCostUsd(usage, prices)).toBeCloseTo(29.4);
  });

  it("behandelt fehlende Werte (alte Protokolle) als null", () => {
    const usage = { input_tokens: 250, output_tokens: 500, cache_write_tokens: null, cache_read_tokens: null };
    expect(estimateCostUsd(usage, prices)).toBeCloseTo(0.011);
  });
});

describe("totalInputTokens", () => {
  it("zählt zwischengespeicherte Eingabe mit", () => {
    expect(totalInputTokens({ input_tokens: 200, output_tokens: 0, cache_write_tokens: 1700, cache_read_tokens: 0 })).toBe(1900);
  });
});
