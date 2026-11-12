import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { categories, categoryLabels, storyStatusLabels, storyStatuses } from "@/config/taxonomy";
import { EmptyState, LoadingBlock, PageHeader, buttonClass, cardClass, inputClass } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { aiApiKey } from "@/lib/ai/client";
import { listStories } from "@/lib/db/stories";
import { parseStoryQuery, storyQueryString } from "@/lib/validation/story-form";
import { StoryCard } from "../story-card";

export const metadata: Metadata = { title: "Ticker" };

function SortTab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-11 items-center rounded-full px-4 text-[0.95rem] ${
        active ? "bg-accent font-medium text-accent-foreground" : "border border-input bg-surface hover:bg-surface-muted"
      }`}
    >
      {children}
    </Link>
  );
}

async function Stories({ searchParams }: { searchParams: PageProps<"/admin/ticker">["searchParams"] }) {
  await requireAdmin();
  const query = parseStoryQuery(await searchParams);
  const stories = await listStories({ ...query, limit: 100 });

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <SortTab href={`/admin/ticker${storyQueryString(query, { sort: "wichtigkeit" })}`} active={query.sort === "wichtigkeit"}>
            Nach Wichtigkeit
          </SortTab>
          <SortTab href={`/admin/ticker${storyQueryString(query, { sort: "neu" })}`} active={query.sort === "neu"}>
            Neueste zuerst
          </SortTab>
        </div>
        <form method="get" className="flex flex-wrap items-end gap-2">
          {query.sort === "neu" ? <input type="hidden" name="sortierung" value="neu" /> : null}
          <div className="flex flex-col gap-1">
            <label htmlFor="status" className="text-sm text-muted">Status</label>
            <select id="status" name="status" defaultValue={query.status ?? ""} className={inputClass}>
              <option value="">Alle</option>
              {storyStatuses.map((s) => (
                <option key={s} value={s}>{storyStatusLabels[s]}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="kategorie" className="text-sm text-muted">Kategorie</label>
            <select id="kategorie" name="kategorie" defaultValue={query.category ?? ""} className={inputClass}>
              <option value="">Alle</option>
              {categories.map((c) => (
                <option key={c} value={c}>{categoryLabels[c]}</option>
              ))}
            </select>
          </div>
          <button type="submit" className={buttonClass}>Anzeigen</button>
        </form>
      </div>

      {stories.length === 0 ? (
        <EmptyState>
          {aiApiKey()
            ? "Noch keine ausgewerteten Meldungen. Der Worker wertet neue Rohdaten automatisch aus."
            : "Noch keine ausgewerteten Meldungen. Die KI-Auswertung startet, sobald ein API-Schlüssel hinterlegt ist (DENTAL_TICKER_ANTHROPIC_API_KEY)."}
        </EmptyState>
      ) : (
        <div className={`${cardClass} divide-y divide-border overflow-hidden`}>
          {stories.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      )}
    </>
  );
}

export default function TickerPage(props: PageProps<"/admin/ticker">) {
  return (
    <>
      <PageHeader
        eyebrow="Von der KI ausgewertet"
        title="Ticker"
        description="Jede Meldung mit Zusammenfassung, Wichtigkeit und Begründung. Die Wichtigkeit rechnet das System aus den Fakten, die die KI feststellt."
      />
      <Suspense fallback={<LoadingBlock />}>
        <Stories searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
