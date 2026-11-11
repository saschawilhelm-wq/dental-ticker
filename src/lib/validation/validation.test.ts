import { describe, expect, it } from "vitest";
import { generateToken, hashToken, isPlausibleEmail, looksLikeToken, normalizeEmail } from "@/lib/auth/tokens";
import { escapeLike } from "@/lib/db/raw-items";
import { formatInterval } from "@/lib/format";
import { parseRawItemQuery, parseRunQuery, rawItemQueryString } from "./filters";
import { parseSourceForm } from "./source-form";

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const valid = {
  name: "BZÄK — Presse",
  slug: "bzaek-presse",
  homepageUrl: "https://www.bzaek.de/",
  feedUrl: "https://www.bzaek.de/feed.xml",
  fetchMethod: "rss",
  fetchIntervalMin: "30",
  trustLevel: "A",
  kind: "primary",
  country: "DE",
  language: "de",
  isActive: "on",
  termsNote: "",
};

describe("parseSourceForm", () => {
  it("übernimmt gültige Eingaben und wandelt Typen", () => {
    const result = parseSourceForm(form(valid));
    expect(result).toEqual({
      ok: true,
      value: {
        name: "BZÄK — Presse",
        slug: "bzaek-presse",
        homepageUrl: "https://www.bzaek.de/",
        feedUrl: "https://www.bzaek.de/feed.xml",
        fetchMethod: "rss",
        fetchIntervalMin: 30,
        trustLevel: "A",
        kind: "primary",
        country: "DE",
        language: "de",
        isActive: true,
        termsNote: null,
      },
    });
  });

  it("verlangt eine Feed-Adresse für automatische Abrufe, nicht für manuelle Pflege", () => {
    const rss = parseSourceForm(form({ ...valid, feedUrl: "" }));
    expect(rss.ok).toBe(false);
    if (!rss.ok) expect(rss.errors.feedUrl).toMatch(/Feed-Adresse/);
    expect(parseSourceForm(form({ ...valid, feedUrl: "", fetchMethod: "manual" })).ok).toBe(true);
  });

  it("weist ungültige Werte mit verständlicher Meldung zurück", () => {
    const result = parseSourceForm(
      form({ ...valid, slug: "Mit Leerzeichen", feedUrl: "ftp://x.de/f", fetchIntervalMin: "1", trustLevel: "Z" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.slug).toMatch(/Kleinbuchstaben/);
      expect(result.errors.feedUrl).toMatch(/https:\/\//);
      expect(result.errors.fetchIntervalMin).toMatch(/Mindestens 5/);
      expect(result.errors.trustLevel).toBe("Bitte einen gültigen Wert wählen.");
    }
  });

  it("wertet ein fehlendes Häkchen als inaktiv", () => {
    const data = form(valid);
    data.delete("isActive");
    const result = parseSourceForm(data);
    expect(result.ok && result.value.isActive).toBe(false);
  });
});

describe("parseRawItemQuery", () => {
  it("ignoriert ungültige Filterwerte statt zu scheitern", () => {
    expect(
      parseRawItemQuery({ quelle: "keine-uuid", status: "gelöscht", von: "2026-02-30", bis: "gestern", seite: "-3" }),
    ).toEqual({ sourceId: undefined, status: undefined, search: undefined, from: undefined, to: undefined, page: 1 });
  });

  it("übernimmt gültige Werte und baut den Query-String zurück", () => {
    const query = parseRawItemQuery({
      quelle: "0b7c5f0e-8f1a-4c39-9a51-0c1d2e3f4a5b",
      status: "new",
      suche: " ePA ",
      von: "2026-11-01",
      bis: "2026-11-11",
      seite: "2",
    });
    expect(query).toMatchObject({ status: "new", search: "ePA", from: "2026-11-01", to: "2026-11-11", page: 2 });
    expect(rawItemQueryString(query, { page: 1 })).toBe(
      "?quelle=0b7c5f0e-8f1a-4c39-9a51-0c1d2e3f4a5b&status=new&suche=ePA&von=2026-11-01&bis=2026-11-11",
    );
  });

  it("liest den Problem-Filter des Abrufprotokolls", () => {
    expect(parseRunQuery({ nur: "probleme" })).toEqual({ sourceId: undefined, onlyProblems: true });
  });
});

describe("Login-Token", () => {
  it("erzeugt zufällige, URL-taugliche Token mit 256 Bit", () => {
    const a = generateToken();
    expect(looksLikeToken(a)).toBe(true);
    expect(a).not.toBe(generateToken());
  });

  it("speichert nur einen Hash", () => {
    expect(hashToken("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("lehnt fremde Werte als Token ab", () => {
    expect(looksLikeToken("../../etc/passwd")).toBe(false);
    expect(looksLikeToken(undefined)).toBe(false);
  });

  it("normalisiert und prüft E-Mail-Adressen", () => {
    expect(normalizeEmail("  Praxis@Example.DE ")).toBe("praxis@example.de");
    expect(isPlausibleEmail("praxis@example.de")).toBe(true);
    expect(isPlausibleEmail("praxis@localhost")).toBe(false);
  });
});

describe("Hilfsfunktionen", () => {
  it("maskiert LIKE-Platzhalter", () => {
    expect(escapeLike("50%_a\\b")).toBe("50\\%\\_a\\\\b");
  });

  it("formatiert Abrufintervalle", () => {
    expect(formatInterval(30)).toBe("30 Min.");
    expect(formatInterval(120)).toBe("2 Std.");
    expect(formatInterval(1440)).toBe("1 Tag");
  });
});
