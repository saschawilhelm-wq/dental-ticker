import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LoadingBlock, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { getSource } from "@/lib/db/sources";
import { isUuid } from "@/lib/validation/filters";
import { SourceForm } from "../source-form";

export const metadata: Metadata = { title: "Quelle bearbeiten" };

async function EditSource({ params }: { params: PageProps<"/admin/quellen/[id]">["params"] }) {
  await requireAdmin();
  const { id } = await params;
  const source = isUuid(id) ? await getSource(id) : null;
  if (!source) notFound();
  return <SourceForm source={source} />;
}

export default function EditSourcePage(props: PageProps<"/admin/quellen/[id]">) {
  return (
    <>
      <PageHeader title="Quelle bearbeiten" />
      <Suspense fallback={<LoadingBlock />}>
        <EditSource params={props.params} />
      </Suspense>
    </>
  );
}
