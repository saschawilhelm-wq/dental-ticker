import { z } from "zod";
import { countries, fetchMethods, sourceKinds, trustLevels } from "@/config/taxonomy";
import type { SourceInput } from "@/lib/db/sources";

const optionalHttpUrl = z
  .string()
  .trim()
  .max(2000, "Adresse ist zu lang.")
  .transform((value) => (value === "" ? null : value))
  .refine((value) => {
    if (value === null) return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "Bitte eine vollständige Adresse mit https:// angeben.");

export const sourceFormSchema = z
  .object({
    name: z.string().trim().min(2, "Bitte einen Namen angeben.").max(120, "Name ist zu lang."),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Nur Kleinbuchstaben, Ziffern und Bindestriche.")
      .max(60, "Kürzel ist zu lang."),
    homepageUrl: optionalHttpUrl,
    feedUrl: optionalHttpUrl,
    fetchMethod: z.enum(fetchMethods),
    fetchIntervalMin: z.coerce
      .number({ error: "Bitte eine Zahl angeben." })
      .int("Bitte eine ganze Zahl angeben.")
      .min(5, "Mindestens 5 Minuten — häufigere Abrufe belasten die Quelle.")
      .max(10080, "Höchstens eine Woche (10080 Minuten)."),
    trustLevel: z.enum(trustLevels),
    kind: z.enum(sourceKinds),
    country: z.enum(countries),
    language: z.string().trim().regex(/^[a-z]{2}$/, "Zweistelliger Sprachcode, z. B. de."),
    isActive: z.boolean(),
    termsNote: z
      .string()
      .trim()
      .max(2000, "Notiz ist zu lang.")
      .transform((value) => (value === "" ? null : value)),
  })
  .refine((data) => data.fetchMethod === "manual" || data.feedUrl !== null, {
    message: "Für automatische Abrufe wird eine Feed-Adresse benötigt.",
    path: ["feedUrl"],
  });

export type SourceFormErrors = Partial<Record<keyof SourceInput | "form", string>>;

export type SourceFormResult =
  | { ok: true; value: SourceInput }
  | { ok: false; errors: SourceFormErrors };

/** Liest und prüft das Quellen-Formular. Rein, ohne Datenbankzugriff. */
export function parseSourceForm(form: FormData): SourceFormResult {
  const get = (key: string) => {
    const value = form.get(key);
    return typeof value === "string" ? value : "";
  };
  const parsed = sourceFormSchema.safeParse({
    name: get("name"),
    slug: get("slug"),
    homepageUrl: get("homepageUrl"),
    feedUrl: get("feedUrl"),
    fetchMethod: get("fetchMethod"),
    fetchIntervalMin: get("fetchIntervalMin"),
    trustLevel: get("trustLevel"),
    kind: get("kind"),
    country: get("country"),
    language: get("language"),
    isActive: form.get("isActive") === "on",
    termsNote: get("termsNote"),
  });
  if (parsed.success) return { ok: true, value: parsed.data };
  const errors: SourceFormErrors = {};
  for (const issue of parsed.error.issues) {
    const key = (issue.path[0] ?? "form") as keyof SourceFormErrors;
    errors[key] ??= issue.code === "invalid_value" ? "Bitte einen gültigen Wert wählen." : issue.message;
  }
  return { ok: false, errors };
}
