"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { markFetched } from "@/lib/db/ingest";
import { getPool } from "@/lib/db/pool";
import { createSource, getSource, setSourceActive, slugExists, updateSource } from "@/lib/db/sources";
import { defaultIngestDeps, runSource } from "@/lib/ingest/run-source";
import { isUuid } from "@/lib/validation/filters";
import { parseSourceForm, type SourceFormErrors } from "@/lib/validation/source-form";

export type SourceFormState = {
  errors: SourceFormErrors;
  /** Eingaben zurück an das Formular, damit nach einem Fehler nichts verloren geht. */
  values?: Record<string, string>;
};

function echo(form: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of form.entries()) if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  if (!form.has("isActive")) values.isActive = "";
  return values;
}

/** Legt eine Quelle an (`id` leer) oder ändert sie. */
export async function saveSourceAction(_prev: SourceFormState, form: FormData): Promise<SourceFormState> {
  await requireAdmin();
  const rawId = form.get("id");
  const id = isUuid(rawId) ? rawId : null;
  const parsed = parseSourceForm(form);
  if (!parsed.ok) return { errors: parsed.errors, values: echo(form) };
  if (await slugExists(parsed.value.slug, id)) {
    return { errors: { slug: "Dieses Kürzel ist schon vergeben." }, values: echo(form) };
  }
  const saved = id ? await updateSource(id, parsed.value) : await createSource(parsed.value);
  if (!saved) return { errors: { form: "Quelle nicht gefunden." }, values: echo(form) };
  redirect(`/admin/quellen?gespeichert=${saved.id}`);
}

export async function toggleSourceAction(form: FormData): Promise<void> {
  await requireAdmin();
  const id = form.get("id");
  if (!isUuid(id)) return;
  await setSourceActive(id, form.get("active") === "true");
  refresh();
}

export type FetchNowState = { message: string; tone: "ok" | "warn" | "error" } | null;

/** Ruft eine Quelle sofort ab, unabhängig vom Intervall. */
export async function fetchNowAction(_prev: FetchNowState, form: FormData): Promise<FetchNowState> {
  await requireAdmin();
  const id = form.get("id");
  if (!isUuid(id)) return { message: "Ungültige Quelle.", tone: "error" };
  const source = await getSource(id);
  if (!source) return { message: "Quelle nicht gefunden.", tone: "error" };
  if (source.fetch_method !== "rss") {
    return { message: "Nur RSS-Quellen können in Phase 1 automatisch abgerufen werden.", tone: "warn" };
  }
  await markFetched(source.id);
  const result = await runSource(source, defaultIngestDeps(getPool()));
  refresh();
  switch (result.status) {
    case "ok":
      return { message: `${result.itemsNew} neue von ${result.itemsSeen} Einträgen.`, tone: "ok" };
    case "not_modified":
      return { message: "Feed unverändert seit dem letzten Abruf.", tone: "ok" };
    case "blocked_robots":
      return { message: "Abruf durch robots.txt untersagt.", tone: "warn" };
    default:
      return { message: result.error ?? "Abruf fehlgeschlagen.", tone: "error" };
  }
}
