/**
 * Empfehlungen „in eigener Sache“ (SPEC E-12). Nur Werte — angezeigt werden sie
 * ab Phase 3 als dezente Karte am Ende des Feeds und ab Phase 3b im Outro des
 * Wochen-Audio-Briefings. Sie beeinflussen nie Sortierung oder Gewichtung.
 * Ein White-Label-Partner ersetzt diese Liste durch eigene Einträge.
 *
 * Angaben übernommen von parsmedia.info (Stand 12.11.2026).
 */
export type Recommendation = {
  id: string;
  title: string;
  publisher: string;
  /** Ein Satz, ruhig formuliert, ohne Werbesprache. */
  teaser: string;
  url: string;
  /** Öffentlicher Podcast-Feed, z. B. für „neueste Folge“. */
  feedUrl: string | null;
  label: string;
};

export const recommendations: readonly Recommendation[] = [
  {
    id: "punktuell",
    title: "punk.tuell",
    publisher: "parsmedia Praxismarketing",
    teaser: "Der Marketing-Podcast für die Zahnarztpraxis: kurze Folgen zu Sichtbarkeit, Patientengewinnung und Teambindung.",
    url: "https://parsmedia.info/marketing-podcast/",
    feedUrl: "https://praxismarketing.podigee.io/feed/mp3",
    label: "Empfehlung in eigener Sache",
  },
  {
    id: "pelf",
    title: "P[e.l.f.]",
    publisher: "parsmedia Praxismarketing",
    teaser: "Der Podcast für einfache und leichte Praxisführung.",
    url: "https://parsmedia.info/p11-podcast/",
    feedUrl: null,
    label: "Empfehlung in eigener Sache",
  },
];
