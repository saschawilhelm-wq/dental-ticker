import { Badge } from "@/components/ui";
import type { Source } from "@/lib/db/sources";

type State = Pick<Source, "is_active" | "robots_allowed" | "consecutive_failures" | "last_success_at">;

/** Zustand einer Quelle als Plakette. `compact` für schmale Spalten. */
export function SourceState({ source, compact = false }: { source: State; compact?: boolean }) {
  if (!source.is_active) return <Badge tone="neutral">Inaktiv</Badge>;
  if (source.robots_allowed === false) return <Badge tone="warn">{compact ? "Gesperrt" : "robots.txt sperrt"}</Badge>;
  if (source.consecutive_failures > 0) {
    return <Badge tone="error">{compact ? "Fehler" : `${source.consecutive_failures} Fehler in Folge`}</Badge>;
  }
  if (!source.last_success_at) return <Badge tone="neutral">{compact ? "Neu" : "Noch nicht abgerufen"}</Badge>;
  return <Badge tone="ok">In Ordnung</Badge>;
}
