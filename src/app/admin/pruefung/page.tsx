import type { Metadata } from "next";
import { Suspense } from "react";
import { EmptyState, LoadingBlock, PageHeader, cardClass } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { listStories } from "@/lib/db/stories";
import { StoryCard } from "../story-card";

export const metadata: Metadata = { title: "Zur Prüfung" };

async function Queue() {
  await requireAdmin();
  const stories = await listStories({ status: "in_review", sort: "wichtigkeit", limit: 200 });
  if (stories.length === 0) {
    return <EmptyState>Nichts zu prüfen. Alle ausgewerteten Meldungen haben die KI-Prüfung bestanden.</EmptyState>;
  }
  return (
    <>
      <p role="status" className="mb-4 text-sm text-muted">
        {stories.length === 1 ? "1 Meldung wartet" : `${stories.length} Meldungen warten`} auf eine Entscheidung, wichtigste zuerst.
      </p>
      <div className={`${cardClass} divide-y divide-border overflow-hidden`}>
        {stories.map((story) => (
          <StoryCard key={story.id} story={story} showStatus={false} />
        ))}
      </div>
    </>
  );
}

export default function ReviewQueuePage() {
  return (
    <>
      <PageHeader
        eyebrow="Review-Warteschlange"
        title="Zur Prüfung"
        description="Hier landen Meldungen, bei denen die KI-Prüfung eine Abweichung gefunden hat, die Prüfung fehlgeschlagen ist oder eine automatische Regel angeschlagen hat. Ohne Freigabe erscheinen sie nicht."
      />
      <Suspense fallback={<LoadingBlock />}>
        <Queue />
      </Suspense>
    </>
  );
}
