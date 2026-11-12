import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Notice } from "@/components/ui";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Anmelden" };

async function LoginNotice({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const params = await searchParams;
  if (params.fehler === "link-ungueltig") {
    return <Notice tone="error">Der Link ist abgelaufen oder wurde schon benutzt. Bitte einen neuen anfordern.</Notice>;
  }
  if (params.abgemeldet) return <Notice tone="ok">Abgemeldet.</Notice>;
  return null;
}

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <AuthShell title="Anmelden" intro="Ohne Passwort: Sie erhalten einen einmaligen Anmeldelink per E-Mail.">
      <Suspense fallback={null}>
        <LoginNotice searchParams={props.searchParams} />
      </Suspense>
      <LoginForm />
    </AuthShell>
  );
}
