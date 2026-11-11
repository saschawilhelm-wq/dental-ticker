import { authConfig } from "@/config/auth";
import {
  consumeLoginTokenHash,
  countRecentLoginTokens,
  findUserByEmail,
  insertLoginToken,
  insertSession,
} from "@/lib/db/users";
import type { Queryable } from "@/lib/db/pool";
import { getPool } from "@/lib/db/pool";
import type { Mailer } from "./mailer";
import { generateToken, hashToken, isPlausibleEmail, looksLikeToken, normalizeEmail } from "./tokens";

export type LoginRequestOutcome =
  | { kind: "sent" } // auch bei unbekannter Adresse — verrät nicht, wer ein Konto hat
  | { kind: "invalid_email" }
  | { kind: "rate_limited" };

/**
 * Erzeugt einen Login-Link und verschickt ihn. In Phase 1 gibt es keine
 * Selbstregistrierung: Nur bereits angelegte Personen erhalten einen Link.
 * Für alle anderen sieht die Antwort trotzdem gleich aus.
 */
export async function requestLoginLink(
  rawEmail: string,
  options: { baseUrl: string; mailer: Mailer; db?: Queryable },
): Promise<LoginRequestOutcome> {
  const db = options.db ?? getPool();
  const email = normalizeEmail(rawEmail);
  if (!isPlausibleEmail(email)) return { kind: "invalid_email" };

  const user = await findUserByEmail(email, db);
  if (!user) return { kind: "sent" };

  const { maxRequests, windowMinutes } = authConfig.loginRateLimit;
  if ((await countRecentLoginTokens(user.id, windowMinutes, db)) >= maxRequests) {
    return { kind: "rate_limited" };
  }

  const token = generateToken();
  await insertLoginToken(user.id, hashToken(token), authConfig.loginTokenTtlMinutes, db);
  const link = new URL("/login/bestaetigen", options.baseUrl);
  link.searchParams.set("token", token);
  await options.mailer.sendLoginLink(user.email, link.toString());
  return { kind: "sent" };
}

/**
 * Löst ein Login-Token ein und legt eine Sitzung an. Gibt das Sitzungs-Token
 * (für das Cookie) zurück oder null, wenn das Token nicht gültig ist.
 */
export async function exchangeLoginToken(token: unknown, db: Queryable = getPool()): Promise<string | null> {
  if (!looksLikeToken(token)) return null;
  const userId = await consumeLoginTokenHash(hashToken(token), db);
  if (!userId) return null;
  const sessionToken = generateToken();
  await insertSession(userId, hashToken(sessionToken), authConfig.sessionTtlDays, db);
  return sessionToken;
}
