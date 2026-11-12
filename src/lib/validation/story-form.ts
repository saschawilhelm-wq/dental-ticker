import { z } from "zod";
import { actionLevels, categories, storyStatuses, type Category, type StoryStatus } from "@/config/taxonomy";
import { aiConfig } from "@/config/ai";
import { cleanIsoDate } from "@/lib/pipeline/decide";
import type { EditorialUpdate } from "@/lib/db/stories";

export const editorialSchema = z.object({
  headline: z
    .string()
    .trim()
    .min(5, "Bitte eine Überschrift angeben.")
    .max(aiConfig.headlineMaxChars, `Höchstens ${aiConfig.headlineMaxChars} Zeichen.`),
  summary: z.string().trim().min(20, "Bitte eine Zusammenfassung angeben.").max(1200, "Zu lang."),
  wasBedeutetDas: z.string().trim().min(10, "Bitte angeben, was das für die Praxis bedeutet.").max(600, "Zu lang."),
  handlungsbedarf: z.enum(actionLevels),
  frist: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .refine((v) => v === null || cleanIsoDate(v) !== null, "Bitte ein gültiges Datum wählen."),
  category: z.enum(categories),
});

export type EditorialErrors = Partial<Record<keyof EditorialUpdate | "form", string>>;

export function parseEditorialForm(form: FormData): { ok: true; value: EditorialUpdate } | { ok: false; errors: EditorialErrors } {
  const get = (key: string) => {
    const value = form.get(key);
    return typeof value === "string" ? value : "";
  };
  const parsed = editorialSchema.safeParse({
    headline: get("headline"),
    summary: get("summary"),
    wasBedeutetDas: get("wasBedeutetDas"),
    handlungsbedarf: get("handlungsbedarf"),
    frist: get("frist"),
    category: get("category"),
  });
  if (parsed.success) return { ok: true, value: parsed.data };
  const errors: EditorialErrors = {};
  for (const issue of parsed.error.issues) {
    const key = (issue.path[0] ?? "form") as keyof EditorialErrors;
    errors[key] ??= issue.code === "invalid_value" ? "Bitte einen gültigen Wert wählen." : issue.message;
  }
  return { ok: false, errors };
}

type SearchParams = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export type StoryQuery = { status?: StoryStatus; category?: Category; sort: "wichtigkeit" | "neu" };

/** Filter der Ticker-Liste aus der URL; ungültige Werte werden ignoriert. */
export function parseStoryQuery(params: SearchParams): StoryQuery {
  const status = first(params.status);
  const category = first(params.kategorie);
  return {
    status: storyStatuses.includes(status as StoryStatus) ? (status as StoryStatus) : undefined,
    category: categories.includes(category as Category) ? (category as Category) : undefined,
    sort: first(params.sortierung) === "neu" ? "neu" : "wichtigkeit",
  };
}

export function storyQueryString(q: StoryQuery, overrides: Partial<StoryQuery> = {}): string {
  const m = { ...q, ...overrides };
  const p = new URLSearchParams();
  if (m.status) p.set("status", m.status);
  if (m.category) p.set("kategorie", m.category);
  if (m.sort === "neu") p.set("sortierung", "neu");
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** Anteil übereinstimmender Einschätzungen von KI und Redaktion. Rein. */
export function agreementRate(
  pairs: { aiBand: "hoch" | "mittel" | "niedrig"; editorBand: "hoch" | "mittel" | "niedrig"; editorRelevant: boolean }[],
): { total: number; agree: number; rate: number | null } {
  const total = pairs.length;
  const agree = pairs.filter((p) => (p.editorRelevant ? p.aiBand === p.editorBand : p.aiBand === "niedrig")).length;
  return { total, agree, rate: total === 0 ? null : agree / total };
}
