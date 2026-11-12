import type { FetchRunStatus, RawStatus } from "@/config/taxonomy";

type Tone = "ok" | "warn" | "error" | "neutral";

export function runTone(status: FetchRunStatus): Tone {
  switch (status) {
    case "ok":
      return "ok";
    case "not_modified":
    case "running":
      return "neutral";
    case "blocked_robots":
      return "warn";
    case "error":
      return "error";
  }
}

export function rawTone(status: RawStatus): Tone {
  switch (status) {
    case "new":
      return "neutral";
    case "clustered":
      return "ok";
    case "ignored":
      return "neutral";
    case "error":
      return "error";
  }
}

export function storyTone(status: import("@/config/taxonomy").StoryStatus): Tone {
  switch (status) {
    case "published":
      return "ok";
    case "in_review":
      return "warn";
    case "blocked":
      return "error";
    default:
      return "neutral";
  }
}

export function actionTone(level: import("@/config/taxonomy").ActionLevel | null): Tone {
  if (level === "handeln") return "warn";
  return "neutral";
}
