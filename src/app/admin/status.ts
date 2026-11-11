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
