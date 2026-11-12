import { describe, expect, it } from "vitest";
import { formatDayHeading, formatRelative, groupByDay, sourceMonogram, sourceTint } from "./format";

const now = new Date("2026-11-12T08:00:00Z"); // 09:00 in Berlin

describe("formatDayHeading", () => {
  it("benennt heute und gestern nach deutscher Zeit", () => {
    expect(formatDayHeading(new Date("2026-11-12T00:30:00Z"), now)).toBe("Heute");
    // 23:30 UTC am 11. ist in Berlin schon der 12.
    expect(formatDayHeading(new Date("2026-11-11T23:30:00Z"), now)).toBe("Heute");
    expect(formatDayHeading(new Date("2026-11-11T12:00:00Z"), now)).toBe("Gestern");
    expect(formatDayHeading(new Date("2026-11-09T12:00:00Z"), now)).toBe("Montag, 9. November");
  });
});

describe("formatRelative", () => {
  it("beschreibt Abstände in Worten", () => {
    expect(formatRelative(null, now)).toBe("noch nie");
    expect(formatRelative(new Date(now.getTime() - 20_000), now)).toBe("gerade eben");
    expect(formatRelative(new Date(now.getTime() - 25 * 60_000), now)).toBe("vor 25 Min.");
    expect(formatRelative(new Date(now.getTime() - 3 * 3_600_000), now)).toBe("vor 3 Std.");
    expect(formatRelative(new Date(now.getTime() - 50 * 3_600_000), now)).toBe("vor 2 Tagen");
  });
});

describe("groupByDay", () => {
  it("fasst aufeinanderfolgende Einträge desselben Tages zusammen", () => {
    const items = ["2026-11-12T07:00:00Z", "2026-11-12T01:00:00Z", "2026-11-10T12:00:00Z"].map((d) => new Date(d));
    const groups = groupByDay(items, (d) => d);
    expect(groups.map((g) => [g.key, g.items.length])).toEqual([
      ["2026-11-12", 2],
      ["2026-11-10", 1],
    ]);
  });
});

describe("Quellen-Kürzel", () => {
  it("bildet zwei Buchstaben aus dem Organisationsnamen", () => {
    expect(sourceMonogram("G-BA — Beschlüsse")).toBe("GB");
    expect(sourceMonogram("gematik — Newsroom")).toBe("GE");
    expect(sourceMonogram("RKI — Krankenhaushygiene (KRINKO)")).toBe("RK");
    expect(sourceMonogram("BZÄK")).toBe("BZ");
  });

  it("gibt Quellen derselben Organisation denselben Ton", () => {
    expect(sourceTint("G-BA — Beschlüsse")).toBe(sourceTint("G-BA — Pressemitteilungen"));
    expect([1, 2, 3, 4, 5]).toContain(sourceTint("gematik — Newsroom"));
  });
});
