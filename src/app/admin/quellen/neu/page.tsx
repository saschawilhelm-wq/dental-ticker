import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingBlock, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { SourceForm } from "../source-form";

export const metadata: Metadata = { title: "Quelle hinzufügen" };

async function Guarded() {
  await requireAdmin();
  return <SourceForm />;
}

export default function NewSourcePage() {
  return (
    <>
      <PageHeader
        eyebrow="Quellen"
        title="Quelle hinzufügen"
        description="Vor dem Aktivieren bitte robots.txt und Nutzungsbedingungen der Quelle prüfen und das Ergebnis in der Notiz festhalten. Der Abruf prüft robots.txt zusätzlich bei jedem Lauf."
      />
      <Suspense fallback={<LoadingBlock />}>
        <Guarded />
      </Suspense>
    </>
  );
}
