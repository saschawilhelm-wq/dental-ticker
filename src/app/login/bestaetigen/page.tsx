import type { Metadata } from "next";
import { Suspense } from "react";
import { buttonClass } from "@/components/ui";
import { confirmLoginAction } from "../actions";

export const metadata: Metadata = { title: "Anmeldung bestätigen" };

/**
 * Der Link aus der E-Mail meldet nicht sofort an, sondern zeigt diesen Knopf.
 * Grund: Virenscanner in Mailprogrammen rufen Links automatisch auf und würden
 * das Einmal-Token sonst verbrauchen, bevor die Person klickt.
 */
async function ConfirmForm({ searchParams }: { searchParams: PageProps<"/login/bestaetigen">["searchParams"] }) {
  const { token } = await searchParams;
  return (
    <form action={confirmLoginAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={typeof token === "string" ? token : ""} />
      <button type="submit" className={buttonClass}>
        Jetzt anmelden
      </button>
    </form>
  );
}

export default function ConfirmLoginPage(props: PageProps<"/login/bestaetigen">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">Anmeldung bestätigen</h1>
      <Suspense fallback={null}>
        <ConfirmForm searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
