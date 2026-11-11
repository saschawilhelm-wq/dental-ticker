import type { ReactNode } from "react";

/** Gemeinsame Klassen, damit Bedienelemente überall gleich aussehen (min. 44 px hoch). */
export const buttonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-accent px-4 font-medium text-accent-foreground disabled:opacity-60";
export const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 font-medium disabled:opacity-60";
export const inputClass =
  "min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground aria-[invalid=true]:border-error";
export const linkClass = "underline decoration-1 underline-offset-2 hover:decoration-2";

type Tone = "ok" | "warn" | "error" | "neutral";

const toneClass: Record<Tone, string> = {
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  error: "bg-error-bg text-error",
  neutral: "bg-neutral-bg text-foreground",
};

const toneSymbol: Record<Tone, string> = { ok: "✓", warn: "!", error: "✕", neutral: "•" };

/** Status-Plakette: Bedeutung immer über Text und Symbol, nie nur über Farbe. */
export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${toneClass[tone]}`}
    >
      <span aria-hidden="true">{toneSymbol[tone]}</span>
      {children}
    </span>
  );
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="font-medium">
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${htmlFor}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-sm text-error">
          <span aria-hidden="true">✕ </span>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function LoadingBlock({ label = "Wird geladen …" }: { label?: string }) {
  return (
    <p role="status" className="py-8 text-muted">
      {label}
    </p>
  );
}
