import { z } from "zod";
import {
  affectedness,
  bindingness,
  categories,
  certainties,
  moneyKinds,
  obligations,
  roles,
} from "@/config/taxonomy";

/**
 * Antwortformat der Analyse. Die KI liefert Fakten und Texte; die Wichtigkeit
 * rechnet der Code (src/lib/scoring). Die Feldbeschreibungen gehen als Schema
 * an die API und sind Teil der Anweisung.
 */
export const analysisSchema = z.object({
  betroffenheit: z
    .enum(affectedness)
    .describe("Betrifft die Meldung Zahnarztpraxen bzw. die Dentalbranche direkt, indirekt oder gar nicht?"),
  betroffenheit_begruendung: z.string().describe("Ein Satz, warum."),
  headline: z.string().describe("Sachliche Überschrift, höchstens 90 Zeichen, kein Clickbait."),
  summary: z.string().describe("Genau drei Sätze in eigenen Worten. Keine wörtlichen Übernahmen."),
  was_bedeutet_das: z.string().describe("Ein bis zwei Sätze: konkrete Auswirkung auf die Praxis."),
  kategorie: z.enum(categories),
  verpflichtung: z.enum(obligations).describe("Muss eine Praxis etwas tun (pflicht), wird etwas empfohlen, oder ist es nur Information?"),
  frist: z.string().nullable().describe("Frist für Praxen als YYYY-MM-DD, nur wenn ausdrücklich in der Quelle genannt, sonst null."),
  frist_beschreibung: z.string().nullable().describe("Was bis zur Frist zu tun ist, sonst null."),
  geld: z.enum(moneyKinds).describe("Geht es um Honorar/Abrechnung, Kosten, eine Sanktion oder nichts davon?"),
  verbindlichkeit: z.enum(bindingness).describe("Stand bei Regelungen: Entwurf, beschlossen, in Kraft; sonst nicht_anwendbar."),
  rollen: z.array(z.enum(roles)).describe("Welche Rollen sind ausdrücklich betroffen?"),
  unternehmensmeldung: z.boolean().describe("Stammt die Meldung von einem Unternehmen über eigene Produkte oder Angebote?"),
  sicherheit_rueckruf: z.boolean().describe("Rückruf, Sicherheitswarnung oder Lieferengpass?"),
  termin: z.string().nullable().describe("Veranstaltungsdatum als YYYY-MM-DD bei Messen/Fortbildungen, sonst null."),
  sicherheit: z.enum(certainties).describe("offiziell = Primärquelle selbst; berichtet = Presse; unbestaetigt = Gerücht/Ankündigung."),
  gleiches_ereignis_wie: z
    .string()
    .nullable()
    .describe("ID eines Kandidaten aus der Liste, wenn es um genau dasselbe Ereignis geht, sonst null."),
});
export type Analysis = z.infer<typeof analysisSchema>;

export const checkSchema = z.object({
  ergebnis: z.enum(["bestanden", "abweichung"]),
  probleme: z
    .array(
      z.object({
        feld: z.enum(["headline", "summary", "was_bedeutet_das", "frist", "fakten", "ton"]),
        aussage: z.string().describe("Die beanstandete Aussage, wörtlich aus der Analyse."),
        problem: z.string().describe("Was nicht stimmt oder nicht belegt ist."),
      }),
    )
    .describe("Leer, wenn alles belegt ist."),
});
export type CheckResult = z.infer<typeof checkSchema>;
