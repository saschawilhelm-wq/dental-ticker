import type { Country, FetchMethod, SourceKind, TrustLevel } from "./taxonomy";

export type SeedSource = {
  slug: string;
  name: string;
  homepageUrl: string;
  feedUrl: string | null;
  fetchMethod: FetchMethod;
  fetchIntervalMin: number;
  trustLevel: TrustLevel;
  kind: SourceKind;
  country: Country;
  language: string;
  isActive: boolean;
  termsNote: string;
};

/**
 * Startquellen für Phase 1. Feed-Adressen am 11.11.2026 geprüft.
 * Die Startliste wird über den Admin-Bereich erweitert, nicht hier.
 */
export const seedSources: readonly SeedSource[] = [
  {
    slug: "gba-beschluesse",
    name: "G-BA — Beschlüsse",
    homepageUrl: "https://www.g-ba.de/beschluesse/",
    feedUrl: "https://www.g-ba.de/beschluesse/letzte-aenderungen/rss.xml",
    fetchMethod: "rss",
    fetchIntervalMin: 30,
    trustLevel: "A",
    kind: "primary",
    country: "DE",
    language: "de",
    isActive: true,
    termsNote:
      "Offizieller RSS-Feed. robots.txt sperrt nur /styleguide/ und /sys/suche. Enthält viele nicht-zahnärztliche Beschlüsse; Relevanzfilter folgt in Phase 2.",
  },
  {
    slug: "gba-presse",
    name: "G-BA — Pressemitteilungen",
    homepageUrl: "https://www.g-ba.de/presse/pressemitteilungen-meldungen/",
    feedUrl: "https://www.g-ba.de/presse/pressemitteilungen-meldungen/letzte-aenderungen/rss.xml",
    fetchMethod: "rss",
    fetchIntervalMin: 30,
    trustLevel: "A",
    kind: "primary",
    country: "DE",
    language: "de",
    isActive: true,
    termsNote: "Offizieller RSS-Feed.",
  },
  {
    slug: "gematik-newsroom",
    name: "gematik — Newsroom",
    homepageUrl: "https://www.gematik.de/newsroom",
    feedUrl: "https://www.gematik.de/newsroom/rss.feed",
    fetchMethod: "rss",
    fetchIntervalMin: 30,
    trustLevel: "A",
    kind: "primary",
    country: "DE",
    language: "de",
    isActive: true,
    termsNote: "Offizieller RSS-Feed. robots.txt sperrt nur /typo3/.",
  },
  {
    slug: "rki-krankenhaushygiene",
    name: "RKI — Krankenhaushygiene (KRINKO)",
    homepageUrl: "https://www.rki.de/DE/Themen/Infektionskrankheiten/Krankenhaushygiene/",
    feedUrl: "https://www.rki.de/SiteGlobals/Functions/RSS/RSS-Krankenhaushygiene.xml",
    fetchMethod: "rss",
    fetchIntervalMin: 60,
    trustLevel: "A",
    kind: "primary",
    country: "DE",
    language: "de",
    isActive: false,
    termsNote:
      "Deaktiviert: Die robots.txt des RKI sperrt den Pfad /SiteGlobals/, in dem die RSS-Feeds liegen. Erst nach Freigabe durch das RKI aktivieren, bis dahin manuell pflegen.",
  },
];
