"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import {
  getStory,
  requestReanalysis,
  saveAssessment,
  setStoryStatusByEditor,
  updateStoryEditorial,
} from "@/lib/db/stories";
import { isUuid } from "@/lib/validation/filters";
import { parseEditorialForm, type EditorialErrors } from "@/lib/validation/story-form";

export type EditorialState = { errors: EditorialErrors; saved?: boolean; values?: Record<string, string> };

export async function saveEditorialAction(_prev: EditorialState, form: FormData): Promise<EditorialState> {
  const user = await requireAdmin();
  const id = form.get("id");
  if (!isUuid(id)) return { errors: { form: "Ungültige Meldung." } };
  const values = Object.fromEntries([...form.entries()].filter(([k, v]) => typeof v === "string" && !k.startsWith("$"))) as Record<string, string>;
  const parsed = parseEditorialForm(form);
  if (!parsed.ok) return { errors: parsed.errors, values };
  if (!(await getStory(id))) return { errors: { form: "Meldung nicht gefunden." }, values };
  await updateStoryEditorial(id, parsed.value, user.id);
  refresh();
  return { errors: {}, saved: true };
}

/** Freigeben, sperren oder zurück in die Prüfung — immer mit Vermerk, wer entschieden hat. */
export async function decideStoryAction(form: FormData): Promise<void> {
  const user = await requireAdmin();
  const id = form.get("id");
  const decision = form.get("decision");
  if (!isUuid(id)) return;
  if (decision !== "published" && decision !== "blocked" && decision !== "in_review") return;
  const note = form.get("note");
  await setStoryStatusByEditor(id, decision, user.id, typeof note === "string" && note.trim() ? note.trim().slice(0, 1000) : null);
  refresh();
}

export async function reanalyzeAction(form: FormData): Promise<void> {
  await requireAdmin();
  const id = form.get("id");
  if (!isUuid(id)) return;
  await requestReanalysis(id);
  refresh();
}

export async function assessmentAction(form: FormData): Promise<void> {
  const user = await requireAdmin();
  const id = form.get("id");
  const relevant = form.get("relevant");
  const importance = form.get("importance");
  if (!isUuid(id)) return;
  if (relevant !== "ja" && relevant !== "nein") return;
  if (importance !== "hoch" && importance !== "mittel" && importance !== "niedrig") return;
  const note = form.get("note");
  await saveAssessment(id, user.id, {
    relevant: relevant === "ja",
    importance,
    note: typeof note === "string" && note.trim() ? note.trim().slice(0, 1000) : null,
  });
  refresh();
}
