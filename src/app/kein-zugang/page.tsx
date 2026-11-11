import type { Metadata } from "next";
import { secondaryButtonClass } from "@/components/ui";
import { logoutAction } from "../login/actions";

export const metadata: Metadata = { title: "Kein Zugang" };

export default function NoAccessPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">Kein Zugang</h1>
      <p className="text-muted">Dieses Konto hat keine Berechtigung für den Admin-Bereich.</p>
      <form action={logoutAction}>
        <button type="submit" className={secondaryButtonClass}>
          Abmelden
        </button>
      </form>
    </main>
  );
}
