"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  countries,
  countryLabels,
  fetchMethodLabels,
  fetchMethods,
  sourceKindLabels,
  sourceKinds,
  trustLevelLabels,
  trustLevels,
} from "@/config/taxonomy";
import { buttonClass, cardClass, Field, inputClass, Notice, secondaryButtonClass } from "@/components/ui";
import type { Source } from "@/lib/db/sources";
import { saveSourceAction, type SourceFormState } from "./actions";

const initialState: SourceFormState = { errors: {} };

type Props = { source?: Pick<
  Source,
  | "id" | "name" | "slug" | "homepage_url" | "feed_url" | "fetch_method" | "fetch_interval_min"
  | "trust_level" | "kind" | "country" | "language" | "is_active" | "terms_note"
> };

export function SourceForm({ source }: Props) {
  const [state, formAction, pending] = useActionState(saveSourceAction, initialState);
  const e = state.errors;
  const v = state.values;
  /** Nach einem Fehler die eingegebenen Werte zeigen, sonst die gespeicherten. */
  const val = (key: string, fallback: string | number | null | undefined) => v?.[key] ?? (fallback == null ? "" : String(fallback));
  const invalid = (key: keyof typeof e) => (e[key] ? { "aria-invalid": true, "aria-describedby": `${key}-error` } : {});

  return (
    <form action={formAction} className={`${cardClass} flex max-w-3xl flex-col gap-6 p-5 sm:p-8`} noValidate>
      {source ? <input type="hidden" name="id" value={source.id} /> : null}
      {e.form ? <Notice tone="error">{e.form}</Notice> : null}

      <Field label="Name" htmlFor="name" error={e.name}>
        <input id="name" name="name" defaultValue={val("name", source?.name)} required className={inputClass} {...invalid("name")} />
      </Field>

      <Field label="Kürzel" htmlFor="slug" error={e.slug} hint="Eindeutig, z. B. bzaek-presse. Nur Kleinbuchstaben, Ziffern, Bindestriche.">
        <input id="slug" name="slug" defaultValue={val("slug", source?.slug)} required className={inputClass} {...invalid("slug")} />
      </Field>

      <Field label="Website" htmlFor="homepageUrl" error={e.homepageUrl}>
        <input id="homepageUrl" name="homepageUrl" type="url" defaultValue={val("homepageUrl", source?.homepage_url)} className={inputClass} {...invalid("homepageUrl")} />
      </Field>

      <Field label="Feed-Adresse" htmlFor="feedUrl" error={e.feedUrl} hint="RSS- oder Atom-Feed. Bei manueller Pflege leer lassen.">
        <input id="feedUrl" name="feedUrl" type="url" defaultValue={val("feedUrl", source?.feed_url)} className={inputClass} {...invalid("feedUrl")} />
      </Field>

      <div className="grid gap-6 border-y border-border py-6 sm:grid-cols-2">
        <Field label="Abrufart" htmlFor="fetchMethod" error={e.fetchMethod} hint="In Phase 1 wird nur RSS automatisch abgerufen.">
          <select id="fetchMethod" name="fetchMethod" defaultValue={val("fetchMethod", source?.fetch_method ?? "rss")} className={inputClass}>
            {fetchMethods.map((m) => (
              <option key={m} value={m}>{fetchMethodLabels[m]}</option>
            ))}
          </select>
        </Field>
        <Field label="Abrufintervall (Minuten)" htmlFor="fetchIntervalMin" error={e.fetchIntervalMin}>
          <input id="fetchIntervalMin" name="fetchIntervalMin" type="number" min={5} max={10080} step={1} inputMode="numeric"
            defaultValue={val("fetchIntervalMin", source?.fetch_interval_min ?? 60)} className={inputClass} {...invalid("fetchIntervalMin")} />
        </Field>
        <Field label="Vertrauensstufe" htmlFor="trustLevel" error={e.trustLevel}>
          <select id="trustLevel" name="trustLevel" defaultValue={val("trustLevel", source?.trust_level ?? "A")} className={inputClass}>
            {trustLevels.map((t) => (
              <option key={t} value={t}>{trustLevelLabels[t]}</option>
            ))}
          </select>
        </Field>
        <Field label="Art" htmlFor="kind" error={e.kind} hint="Bei Fachpresse wird der Rohtext nach Ablauf der Frist gelöscht.">
          <select id="kind" name="kind" defaultValue={val("kind", source?.kind ?? "primary")} className={inputClass}>
            {sourceKinds.map((k) => (
              <option key={k} value={k}>{sourceKindLabels[k]}</option>
            ))}
          </select>
        </Field>
        <Field label="Land" htmlFor="country" error={e.country}>
          <select id="country" name="country" defaultValue={val("country", source?.country ?? "DE")} className={inputClass}>
            {countries.map((c) => (
              <option key={c} value={c}>{countryLabels[c]}</option>
            ))}
          </select>
        </Field>
        <Field label="Sprache" htmlFor="language" error={e.language}>
          <input id="language" name="language" defaultValue={val("language", source?.language ?? "de")} maxLength={2} className={inputClass} {...invalid("language")} />
        </Field>
      </div>

      <Field label="Nutzungsbedingungen / Notiz" htmlFor="termsNote" error={e.termsNote} hint="z. B. Ergebnis der robots.txt- und AGB-Prüfung.">
        <textarea id="termsNote" name="termsNote" rows={3} defaultValue={val("termsNote", source?.terms_note)} className={inputClass} />
      </Field>

      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" name="isActive" defaultChecked={v ? v.isActive === "on" : (source?.is_active ?? true)} className="size-5" />
        <span>Aktiv — wird nach Intervall automatisch abgerufen</span>
      </label>

      <div className="flex flex-wrap gap-2 pt-2">
        <button type="submit" className={buttonClass} disabled={pending}>
          {pending ? "Speichert …" : "Speichern"}
        </button>
        <Link href="/admin/quellen" className={secondaryButtonClass}>
          Abbrechen
        </Link>
      </div>
    </form>
  );
}
