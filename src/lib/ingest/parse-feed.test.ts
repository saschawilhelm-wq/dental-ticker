import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { decodeFeed, detectCharset } from "./decode";
import { FeedParseError, parseFeed } from "./parse-feed";

const fixture = (name: string) => readFileSync(path.join(__dirname, "../../../test/fixtures", name));

describe("parseFeed — RSS 2.0", () => {
  const feed = parseFeed(fixture("rss2.xml").toString("utf8"));

  it("erkennt das Format und den Feed-Titel", () => {
    expect(feed.format).toBe("rss2");
    expect(feed.title).toBe("Beispielbehörde: Beschlüsse");
    expect(feed.entries).toHaveLength(5);
  });

  it("liest Link, GUID, Datum und Beschreibung", () => {
    const [first] = feed.entries;
    expect(first.link).toBe("https://behoerde.example/beschluesse/101/?utm_source=rss&utm_medium=feed");
    expect(first.guid).toBe("beschluss-101");
    expect(first.published).toBe("Tue, 10 Nov 2026 12:27:34 +0100");
    expect(first.body).toContain("<b>Bundesanzeiger</b>");
  });

  it("lässt Titel roh, damit Entitäten erst bei der Normalisierung aufgelöst werden", () => {
    expect(feed.entries[0].title).toBe("Richtlinie &amp; Änderung: Festzuschüsse für Zahnersatz");
    expect(feed.entries[1].title).toBe("Zweiter Eintrag mit relativem Link");
  });

  it("nutzt eine GUID als Link, wenn sie ein Permalink ist", () => {
    expect(feed.entries[2].link).toBe("https://behoerde.example/beschluesse/103/");
    expect(feed.entries[2].published).toBe("2026-11-08T09:00:00+01:00");
    expect(feed.entries[2].body).toContain("Langtext aus content:encoded");
  });

  it("nutzt eine GUID mit isPermaLink=false nicht als Link", () => {
    expect(feed.entries[4].link).toBeNull();
    expect(feed.entries[4].guid).toBe("intern-105");
  });
});

describe("parseFeed — Atom", () => {
  const feed = parseFeed(fixture("atom.xml").toString("utf8"));

  it("bevorzugt den alternate-Link und dekodiert ihn", () => {
    expect(feed.format).toBe("atom");
    expect(feed.entries[0].link).toBe("https://fach.example/leitlinien/1?a=1&b=2");
    expect(feed.entries[0].published).toBe("2026-10-31T08:00:00Z");
    expect(feed.entries[0].body).toContain("Volltext");
  });

  it("nimmt einen Link ohne rel und fällt auf updated zurück", () => {
    expect(feed.entries[1].link).toBe("https://fach.example/leitlinien/2");
    expect(feed.entries[1].published).toBe("2026-11-02T10:00:00Z");
  });
});

describe("parseFeed — RSS 1.0 (RDF)", () => {
  it("liest Einträge außerhalb des channel-Elements", () => {
    const feed = parseFeed(fixture("rss1.xml").toString("utf8"));
    expect(feed.format).toBe("rss1");
    expect(feed.entries).toHaveLength(1);
    expect(feed.entries[0]).toMatchObject({ link: "https://rdf.example/a", published: "2026-11-03T12:00:00+01:00" });
  });
});

describe("parseFeed — Fehlerfälle", () => {
  it("lehnt HTML-Seiten und leere Antworten ab", () => {
    expect(() => parseFeed("Fehlerseite")).toThrow(FeedParseError);
    expect(() => parseFeed("<html><body>404</body></html>")).toThrow(/Unbekanntes Feed-Format/);
  });

  it("verarbeitet keine Feeds mit eigenen Entitätsdefinitionen", () => {
    const attack = `<?xml version="1.0"?><!DOCTYPE r [<!ENTITY a "aaaaaaaaaa"><!ENTITY b "&a;&a;&a;&a;">]><rss><channel><title>&b;</title></channel></rss>`;
    expect(() => parseFeed(attack)).toThrow(/Entitätsdefinitionen/);
  });

  it("verträgt einen Kanal ohne Einträge", () => {
    expect(parseFeed('<rss version="2.0"><channel><title>Leer</title></channel></rss>').entries).toEqual([]);
  });
});

describe("Zeichenkodierung", () => {
  it("erkennt ISO-8859-1 aus der XML-Deklaration und erhält Umlaute", () => {
    const bytes = new Uint8Array(fixture("latin1.xml"));
    expect(detectCharset(bytes, "application/xml")).toBe("iso-8859-1");
    const feed = parseFeed(decodeFeed(bytes, null));
    expect(feed.entries[0].title).toBe("Zahnärztliche Gebührenördnung");
  });

  it("bevorzugt den Content-Type-Header", () => {
    expect(detectCharset(new TextEncoder().encode("<rss/>"), "text/xml; charset=windows-1252")).toBe("windows-1252");
  });

  it("fällt auf UTF-8 zurück und erkennt ein BOM", () => {
    expect(detectCharset(new Uint8Array([0x3c]), null)).toBe("utf-8");
    expect(detectCharset(new Uint8Array([0xef, 0xbb, 0xbf, 0x3c]), "text/xml; charset=iso-8859-1")).toBe("utf-8");
  });
});
