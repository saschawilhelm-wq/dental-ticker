"use client";

import { useActionState } from "react";
import { Badge, secondaryButtonClass } from "@/components/ui";
import { fetchNowAction, type FetchNowState } from "./actions";

export function FetchNowButton({ sourceId, disabled }: { sourceId: string; disabled?: boolean }) {
  const [state, formAction, pending] = useActionState<FetchNowState, FormData>(fetchNowAction, null);
  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <input type="hidden" name="id" value={sourceId} />
      <button type="submit" className={secondaryButtonClass} disabled={pending || disabled}>
        {pending ? "Ruft ab …" : "Jetzt abrufen"}
      </button>
      <span role="status" aria-live="polite">
        {state ? <Badge tone={state.tone}>{state.message}</Badge> : null}
      </span>
    </form>
  );
}
