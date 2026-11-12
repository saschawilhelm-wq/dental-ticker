import type { ReactNode } from "react";
import { Circle, CircleAlert, CircleCheck, TriangleAlert, type LucideIcon } from "lucide-react";
import { sourceMonogram, sourceTint } from "@/lib/format";

/** Gemeinsame Klassen, damit Bedienelemente überall gleich aussehen (min. 44 px hoch). */
export const buttonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-[0.95rem] font-medium text-accent-foreground shadow-card transition-opacity duration-300 hover:opacity-90 disabled:opacity-60";
export const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-input bg-surface px-4 text-[0.95rem] font-medium text-foreground transition-colors duration-300 hover:bg-surface-muted disabled:opacity-60";
export const quietButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-[0.95rem] font-medium text-muted transition-colors duration-300 hover:bg-surface-muted hover:text-foreground disabled:opacity-60";
export const inputClass =
  "min-h-11 w-full rounded-lg border border-input bg-surface px-3 py-2 text-foreground placeholder:text-subtle aria-[invalid=true]:border-error";
export const linkClass = "underline decoration-border-strong decoration-1 underline-offset-4 hover:decoration-current";
export const cardClass = "paper rounded-xl border border-border bg-surface shadow-card";

type Tone = "ok" | "warn" | "error" | "neutral";

const toneClass: Record<Tone, string> = {
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  error: "bg-error-bg text-error",
  neutral: "bg-neutral-bg text-muted",
};

const toneIcon: Record<Tone, LucideIcon> = {
  ok: CircleCheck,
  warn: TriangleAlert,
  error: CircleAlert,
  neutral: Circle,
};

/** Status-Plakette: Bedeutung immer über Text und Symbol, nie nur über Farbe. */
export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  const Icon = toneIcon[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[0.8rem] font-medium ${toneClass[tone]}`}
    >
      <Icon aria-hidden="true" className={tone === "neutral" ? "size-2 fill-current" : "size-3.5"} strokeWidth={2.25} />
      {children}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: ReactNode;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="max-w-2xl">
        {eyebrow ? <p className="mb-1 text-sm font-medium text-muted">{eyebrow}</p> : null}
        <h1 className="font-serif text-[2rem] font-semibold leading-tight tracking-tight">{title}</h1>
        {description ? <p className="mt-2 text-muted">{description}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </header>
  );
}

export function SectionHeading({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <h2 className="font-serif text-xl font-semibold">{children}</h2>
      {action}
    </div>
  );
}

/** Kürzel einer Quelle, z. B. „GB“ für G-BA. Ton dient nur der Wiedererkennung. */
export function SourceMark({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const tint = sourceTint(name);
  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: `var(--tint-${tint}-bg)`, color: `var(--tint-${tint}-fg)` }}
      className={`inline-flex shrink-0 items-center justify-center rounded-lg font-semibold tracking-wide ${
        size === "sm" ? "size-8 text-[0.7rem]" : "size-10 text-[0.8rem]"
      }`}
    >
      {sourceMonogram(name)}
    </span>
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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[0.95rem] font-medium">
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${htmlFor}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${htmlFor}-error`} className="flex items-center gap-1.5 text-sm text-error">
          <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Notice({ tone, children }: { tone: "ok" | "error"; children: ReactNode }) {
  const Icon = tone === "ok" ? CircleCheck : CircleAlert;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-lg p-3 ${tone === "ok" ? "bg-ok-bg text-ok" : "bg-error-bg text-error"}`}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className={`${cardClass} p-8 text-center text-muted`}>{children}</p>;
}

export function LoadingBlock({ label = "Wird geladen …" }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col gap-3" aria-label={label}>
      {[0, 1, 2].map((i) => (
        <div key={i} className={`${cardClass} h-24 bg-surface-muted`} />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}
