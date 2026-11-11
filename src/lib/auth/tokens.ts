import { createHash, randomBytes } from "node:crypto";

/** Zufälliges, URL-taugliches Geheimnis (256 Bit). */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * In der Datenbank liegt nur der Hash. Wer die Datenbank liest, kann sich
 * damit weder anmelden noch eine Sitzung übernehmen.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Prüft grob, ob ein übergebener Wert wie ein von uns erzeugtes Token aussieht. */
export function looksLikeToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isPlausibleEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
