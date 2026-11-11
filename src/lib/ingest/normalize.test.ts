import { describe, expect, it } from "vitest";
import { contentHash, htmlToText, normalizeTitle, normalizeUrl, parseFeedDate } from "./normalize";

describe("normalizeUrl", () => {
  it("entfernt Tracking-Parameter und Fragment, sortiert den Rest", () => {
    expect(normalizeUrl("https://Example.DE/a/b?utm_source=rss&z=2&a=1&fbclid=x#teil")).toBe(
      "https://example.de/a/b?a=1&z=2",
    );
  });

  it("löst relative Links gegen die Feed-Adresse auf", () => {
    expect(normalizeUrl("/beschluesse/102/", "https://www.g-ba.de/beschluesse/rss.xml")).toBe(
      "https://www.g-ba.de/beschluesse/102/",
    );
  });

  it("entfernt Standardport und Zugangsdaten", () => {
    expect(normalizeUrl("https://user:pw@example.de:443/x")).toBe("https://example.de/x");
  });

  it("lehnt andere Protokolle und Unsinn ab", () => {
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("mailto:a@b.de")).toBeNull();
    expect(normalizeUrl("kein link")).toBeNull();
    expect(normalizeUrl("   ")).toBeNull();
  });

  it("ergibt für gleiche Artikel mit unterschiedlichem Tracking dieselbe Adresse", () => {
    const a = normalizeUrl("https://x.de/n/1?utm_campaign=a");
    const b = normalizeUrl("https://x.de/n/1?utm_campaign=b#top");
    expect(a).toBe(b);
  });
});

describe("parseFeedDate", () => {
  const now = new Date("2026-11-11T06:00:00Z");

  it("liest RFC-822 (RSS) und ISO 8601 (Atom)", () => {
    expect(parseFeedDate("Tue, 10 Nov 2026 12:27:34 +0100", now, 48)?.toISOString()).toBe("2026-11-10T11:27:34.000Z");
    expect(parseFeedDate("2026-11-01T10:00:00Z", now, 48)?.toISOString()).toBe("2026-11-01T10:00:00.000Z");
  });

  it("verwirft ungültige, leere und weit in der Zukunft liegende Daten", () => {
    expect(parseFeedDate("gestern", now, 48)).toBeNull();
    expect(parseFeedDate("", now, 48)).toBeNull();
    expect(parseFeedDate(null, now, 48)).toBeNull();
    expect(parseFeedDate("2027-01-01T00:00:00Z", now, 48)).toBeNull();
    expect(parseFeedDate("1970-01-01T00:00:00Z", now, 48)).toBeNull();
  });

  it("akzeptiert leichte Zeitzonen-Ungenauigkeit in der Zukunft", () => {
    expect(parseFeedDate("2026-11-12T00:00:00Z", now, 48)).not.toBeNull();
  });
});

describe("htmlToText", () => {
  it("entfernt Tags, behält Absätze und dekodiert Entitäten", () => {
    expect(htmlToText("<p>Zahn&auml;rzte &amp; <b>Labore</b></p><p>Zweiter&nbsp;Absatz</p>")).toBe(
      "Zahnärzte & Labore\nZweiter Absatz",
    );
  });

  it("entfernt Skripte und Styles samt Inhalt", () => {
    expect(htmlToText('<p>Text</p><script>alert("x")</script><style>p{}</style>')).toBe("Text");
  });

  it("behandelt maskiertes HTML wie HTML", () => {
    expect(htmlToText("&lt;p&gt;Maskiertes &lt;em&gt;HTML&lt;/em&gt;&lt;/p&gt;")).toBe("Maskiertes HTML");
  });

  it("lässt Kleiner-Zeichen in normalem Text stehen", () => {
    expect(htmlToText("Werte a &lt; b sind erlaubt")).toBe("Werte a < b sind erlaubt");
  });

  it("kürzt auf die Höchstlänge", () => {
    expect(htmlToText("abcdefghij", 4)).toBe("abcd …");
  });

  it("liefert für leere Eingaben einen leeren Text", () => {
    expect(htmlToText(undefined)).toBe("");
    expect(htmlToText("<p> </p>")).toBe("");
  });
});

describe("normalizeTitle", () => {
  it("macht aus dem Titel eine Zeile", () => {
    expect(normalizeTitle("  Neue <i>Leitlinie</i>\n  Parodontitis ", 500)).toBe("Neue Leitlinie Parodontitis");
  });
});

describe("contentHash", () => {
  it("ist stabil und unterscheidet Titel von Text", () => {
    expect(contentHash("a", "b")).toBe(contentHash("a", "b"));
    expect(contentHash("a", "b")).not.toBe(contentHash("ab", ""));
  });
});
