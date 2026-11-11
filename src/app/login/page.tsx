import type { Metadata } from "next";
import { Suspense } from "react";
import { site } from "@/config/site";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Anmelden" };

async function Notice({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const params = await searchParams;
  if (params.fehler === "link-ungueltig") {
    return (
      <p role="alert" className="rounded-md bg-error-bg p-3 text-error">
        <span aria-hidden="true">✕ </span>Der Link ist abgelaufen oder wurde schon benutzt. Bitte einen neuen anfordern.
      </p>
    );
  }
  if (params.abgemeldet) {
    return (
      <p role="status" className="rounded-md bg-ok-bg p-3 text-ok">
        <span aria-hidden="true">✓ </span>Abgemeldet.
      </p>
    );
  }
  return null;
}

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-16">
      <div>
        <p className="text-sm text-muted">{site.name}</p>
        <h1 className="text-2xl font-semibold">Anmelden</h1>
        <p className="mt-2 text-muted">Ohne Passwort: Sie erhalten einen einmaligen Anmeldelink per E-Mail.</p>
      </div>
      <Suspense fallback={null}>
        <Notice searchParams={props.searchParams} />
      </Suspense>
      <LoginForm />
    </main>
  );
}
