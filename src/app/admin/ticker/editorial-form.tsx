"use client";

import { useActionState } from "react";
import { actionLevelLabels, actionLevels, categories, categoryLabels, type ActionLevel, type Category } from "@/config/taxonomy";
import { buttonClass, Field, inputClass, Notice } from "@/components/ui";
import { saveEditorialAction, type EditorialState } from "./actions";

type Props = {
  story: {
    id: string;
    headline: string;
    summary: string;
    wasBedeutetDas: string;
    handlungsbedarf: ActionLevel;
    frist: string | null;
    category: Category;
  };
};

const initial: EditorialState = { errors: {} };

export function EditorialForm({ story }: Props) {
  const [state, formAction, pending] = useActionState(saveEditorialAction, initial);
  const e = state.errors;
  const v = state.values;
  const val = (key: string, fallback: string | null) => v?.[key] ?? fallback ?? "";
  const invalid = (key: keyof typeof e) => (e[key] ? { "aria-invalid": true, "aria-describedby": `${key}-error` } : {});

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="id" value={story.id} />
      {e.form ? <Notice tone="error">{e.form}</Notice> : null}
      {state.saved ? <Notice tone="ok">Änderungen gespeichert und als redaktionell geprüft vermerkt.</Notice> : null}

      <Field label="Überschrift" htmlFor="headline" error={e.headline} hint="Höchstens 90 Zeichen, sachlich.">
        <input id="headline" name="headline" maxLength={120} defaultValue={val("headline", story.headline)} className={inputClass} {...invalid("headline")} />
      </Field>
      <Field label="Zusammenfassung" htmlFor="summary" error={e.summary} hint="Drei Sätze in eigenen Worten.">
        <textarea id="summary" name="summary" rows={4} defaultValue={val("summary", story.summary)} className={inputClass} {...invalid("summary")} />
      </Field>
      <Field label="Was bedeutet das für die Praxis?" htmlFor="wasBedeutetDas" error={e.wasBedeutetDas}>
        <textarea id="wasBedeutetDas" name="wasBedeutetDas" rows={3} defaultValue={val("wasBedeutetDas", story.wasBedeutetDas)} className={inputClass} {...invalid("wasBedeutetDas")} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Handlungsbedarf" htmlFor="handlungsbedarf" error={e.handlungsbedarf}>
          <select id="handlungsbedarf" name="handlungsbedarf" defaultValue={val("handlungsbedarf", story.handlungsbedarf)} className={inputClass}>
            {actionLevels.map((a) => (
              <option key={a} value={a}>{actionLevelLabels[a]}</option>
            ))}
          </select>
        </Field>
        <Field label="Frist" htmlFor="frist" error={e.frist}>
          <input id="frist" name="frist" type="date" defaultValue={val("frist", story.frist)} className={inputClass} {...invalid("frist")} />
        </Field>
        <Field label="Kategorie" htmlFor="category" error={e.category}>
          <select id="category" name="category" defaultValue={val("category", story.category)} className={inputClass}>
            {categories.map((c) => (
              <option key={c} value={c}>{categoryLabels[c]}</option>
            ))}
          </select>
        </Field>
      </div>
      <div>
        <button type="submit" className={buttonClass} disabled={pending}>
          {pending ? "Speichert …" : "Änderungen speichern"}
        </button>
      </div>
    </form>
  );
}
