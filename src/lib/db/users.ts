import type { AppRole, Role } from "@/config/taxonomy";
import { query, queryOne, type Queryable, getPool } from "./pool";

export type User = {
  id: string;
  email: string;
  display_name: string | null;
  role: Role | null;
  app_role: AppRole;
  created_at: Date;
};

export async function findUserByEmail(email: string, db: Queryable = getPool()): Promise<User | null> {
  return queryOne<User>("SELECT * FROM users WHERE email = $1", [email], db);
}

/** Legt eine Person an oder hebt ihre Rolle an (für das Admin-Skript). */
export async function upsertUser(email: string, appRole: AppRole, db: Queryable = getPool()): Promise<User> {
  const row = await queryOne<User>(
    `INSERT INTO users (email, app_role) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET app_role = EXCLUDED.app_role
     RETURNING *`,
    [email, appRole],
    db,
  );
  await query("INSERT INTO preferences (user_id) VALUES ($1) ON CONFLICT DO NOTHING", [row!.id], db);
  return row!;
}

export async function countRecentLoginTokens(userId: string, windowMinutes: number, db: Queryable = getPool()) {
  const row = await queryOne<{ count: number }>(
    `SELECT count(*)::int AS count FROM login_tokens
      WHERE user_id = $1 AND created_at > now() - make_interval(mins => $2)`,
    [userId, windowMinutes],
    db,
  );
  return row?.count ?? 0;
}

export async function insertLoginToken(userId: string, tokenHash: string, ttlMinutes: number, db: Queryable = getPool()) {
  await query(
    `INSERT INTO login_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + make_interval(mins => $3))`,
    [userId, tokenHash, ttlMinutes],
    db,
  );
}

/**
 * Löst ein Login-Token genau einmal ein. Abgelaufene, unbekannte oder bereits
 * benutzte Token ergeben null. Atomar, auch bei gleichzeitigen Anfragen.
 */
export async function consumeLoginTokenHash(tokenHash: string, db: Queryable = getPool()): Promise<string | null> {
  const row = await queryOne<{ user_id: string }>(
    `UPDATE login_tokens SET used_at = now()
      WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
      RETURNING user_id`,
    [tokenHash],
    db,
  );
  return row?.user_id ?? null;
}

export async function insertSession(userId: string, tokenHash: string, ttlDays: number, db: Queryable = getPool()) {
  await query(
    `INSERT INTO sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + make_interval(days => $3))`,
    [userId, tokenHash, ttlDays],
    db,
  );
}

export async function findUserBySessionHash(tokenHash: string, db: Queryable = getPool()): Promise<User | null> {
  return queryOne<User>(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [tokenHash],
    db,
  );
}

export async function deleteSessionHash(tokenHash: string, db: Queryable = getPool()): Promise<void> {
  await query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash], db);
}

/** Räumt abgelaufene Sitzungen und Login-Token auf. */
export async function purgeExpiredAuth(db: Queryable = getPool()): Promise<void> {
  await query("DELETE FROM sessions WHERE expires_at <= now()", [], db);
  await query("DELETE FROM login_tokens WHERE expires_at <= now() - interval '1 day'", [], db);
}
