"use server";

import { refresh } from "next/cache";
import { rawStatuses, type RawStatus } from "@/config/taxonomy";
import { requireAdmin } from "@/lib/auth/session";
import { setRawItemStatus } from "@/lib/db/raw-items";
import { isUuid } from "@/lib/validation/filters";

/** In Phase 1 nur „ignorieren“ bzw. zurück auf „neu“. Bündeln folgt in Phase 2. */
export async function setRawStatusAction(form: FormData): Promise<void> {
  await requireAdmin();
  const id = form.get("id");
  const status = form.get("status");
  if (!isUuid(id) || !rawStatuses.includes(status as RawStatus)) return;
  if (status !== "ignored" && status !== "new") return;
  await setRawItemStatus(id, status);
  refresh();
}
