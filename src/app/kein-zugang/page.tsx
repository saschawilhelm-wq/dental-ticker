import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { secondaryButtonClass } from "@/components/ui";
import { logoutAction } from "../login/actions";

export const metadata: Metadata = { title: "Kein Zugang" };

export default function NoAccessPage() {
  return (
    <AuthShell title="Kein Zugang" intro="Dieses Konto hat keine Berechtigung für den Redaktionsbereich.">
      <form action={logoutAction}>
        <button type="submit" className={secondaryButtonClass}>
          Abmelden
        </button>
      </form>
    </AuthShell>
  );
}
