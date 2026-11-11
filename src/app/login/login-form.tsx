"use client";

import { useActionState } from "react";
import { buttonClass, Field, inputClass } from "@/components/ui";
import { requestLoginAction, type LoginFormState } from "./actions";

const initialState: LoginFormState = { status: "idle" };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(requestLoginAction, initialState);

  if (state.status === "sent") {
    return (
      <div role="status" className="rounded-md border border-border bg-surface p-4">
        <p className="font-medium">
          <span aria-hidden="true">✓ </span>Bitte Postfach prüfen.
        </p>
        <p className="mt-1 text-muted">
          Wenn zu dieser Adresse ein Konto besteht, ist ein Anmeldelink unterwegs. Er ist 15 Minuten gültig und
          funktioniert nur einmal.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <Field label="E-Mail-Adresse" htmlFor="email" error={state.status === "error" ? state.message : undefined}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClass}
          aria-invalid={state.status === "error"}
          aria-describedby={state.status === "error" ? "email-error" : undefined}
        />
      </Field>
      <button type="submit" className={buttonClass} disabled={pending}>
        {pending ? "Wird gesendet …" : "Anmeldelink anfordern"}
      </button>
    </form>
  );
}
