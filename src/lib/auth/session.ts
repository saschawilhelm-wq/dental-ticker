import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authConfig } from "@/config/auth";
import { deleteSessionHash, findUserBySessionHash, type User } from "@/lib/db/users";
import { hashToken, looksLikeToken } from "./tokens";

export type CurrentUser = Pick<User, "id" | "email" | "display_name" | "app_role">;

/** Liest die Sitzung aus dem Cookie. Pro Anfrage nur einmal (React cache). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(authConfig.sessionCookieName)?.value;
  if (!looksLikeToken(token)) return null;
  const user = await findUserBySessionHash(hashToken(token));
  if (!user) return null;
  return { id: user.id, email: user.email, display_name: user.display_name, app_role: user.app_role };
});

/**
 * Datenzugriffsschicht: Jede Admin-Seite und jede Admin-Server-Action ruft das
 * zuerst auf. Die Umleitung im Proxy ist nur eine Vorprüfung, keine Sicherung.
 */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.app_role !== "admin") redirect("/kein-zugang");
  return user;
}

export async function setSessionCookie(token: string): Promise<void> {
  (await cookies()).set(authConfig.sessionCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: authConfig.sessionTtlDays * 86_400,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(authConfig.sessionCookieName)?.value;
  if (looksLikeToken(token)) await deleteSessionHash(hashToken(token));
  store.delete(authConfig.sessionCookieName);
}
