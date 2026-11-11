/**
 * Markenwerte — bewusst neutral gehalten.
 *
 * Name, Beschreibung und Farben stehen ausschließlich hier und in den
 * CSS-Variablen in `src/app/globals.css`. Ein späteres Branding (oder ein
 * White-Label für Partner) ändert nur diese beiden Stellen.
 */
export const site = {
  name: "Dental-Ticker",
  shortName: "Ticker",
  description:
    "Täglicher Nachrichtenticker für die Dental-Branche: was sich heute geändert hat und was es für die Praxis bedeutet.",
  /** Hintergrund- und Themenfarbe für das PWA-Manifest (neutral). */
  manifestBackground: "#ffffff",
  manifestTheme: "#1f2937",
  locale: "de-DE",
  timeZone: "Europe/Berlin",
} as const;
