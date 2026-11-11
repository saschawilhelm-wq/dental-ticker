import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { exchangeLoginToken, requestLoginLink } from "@/lib/auth/login";
import type { Mailer } from "@/lib/auth/mailer";
import { hashToken } from "@/lib/auth/tokens";
import { findUserBySessionHash, upsertUser } from "@/lib/db/users";
import { freshDatabase, testDatabaseUrl } from "./db";

function recordingMailer() {
  const sent: { to: string; link: string }[] = [];
  const mailer: Mailer = {
    async sendLoginLink(to, link) {
      sent.push({ to, link });
    },
  };
  return { mailer, sent };
}

const tokenFrom = (link: string) => new URL(link).searchParams.get("token");

describe.skipIf(!testDatabaseUrl)("Anmeldung per Magic Link", () => {
  let pool: Pool;
  const baseUrl = "https://ticker.example";

  beforeAll(async () => {
    pool = await freshDatabase();
  });
  afterAll(async () => {
    await pool?.end();
  });
  beforeEach(async () => {
    await pool.query("TRUNCATE users CASCADE");
    await upsertUser("admin@praxis.example", "admin", pool);
  });

  it("schickt bekannten Personen einen Link und meldet sie genau einmal an", async () => {
    const { mailer, sent } = recordingMailer();
    expect(await requestLoginLink("  Admin@Praxis.example ", { baseUrl, mailer, db: pool })).toEqual({ kind: "sent" });
    expect(sent).toHaveLength(1);
    expect(sent[0].link.startsWith("https://ticker.example/login/bestaetigen?token=")).toBe(true);

    const token = tokenFrom(sent[0].link);
    const stored = await pool.query("SELECT token_hash FROM login_tokens");
    expect(stored.rows[0].token_hash).toBe(hashToken(token!));
    expect(stored.rows[0].token_hash).not.toBe(token);

    const session = await exchangeLoginToken(token, pool);
    expect(session).not.toBeNull();
    expect((await findUserBySessionHash(hashToken(session!), pool))?.email).toBe("admin@praxis.example");

    expect(await exchangeLoginToken(token, pool)).toBeNull();
  });

  it("verrät nicht, ob eine Adresse ein Konto hat", async () => {
    const { mailer, sent } = recordingMailer();
    expect(await requestLoginLink("fremd@example.de", { baseUrl, mailer, db: pool })).toEqual({ kind: "sent" });
    expect(sent).toHaveLength(0);
    expect((await pool.query("SELECT count(*)::int AS n FROM login_tokens")).rows[0].n).toBe(0);
  });

  it("lehnt abgelaufene, unbekannte und kaputte Token ab", async () => {
    const { mailer, sent } = recordingMailer();
    await requestLoginLink("admin@praxis.example", { baseUrl, mailer, db: pool });
    await pool.query("UPDATE login_tokens SET expires_at = now() - interval '1 minute'");
    expect(await exchangeLoginToken(tokenFrom(sent[0].link), pool)).toBeNull();
    expect(await exchangeLoginToken("A".repeat(43), pool)).toBeNull();
    expect(await exchangeLoginToken("kurz", pool)).toBeNull();
    expect(await exchangeLoginToken(null, pool)).toBeNull();
  });

  it("begrenzt die Zahl der Links pro Person", async () => {
    const { mailer, sent } = recordingMailer();
    for (let i = 0; i < 5; i++) await requestLoginLink("admin@praxis.example", { baseUrl, mailer, db: pool });
    expect(await requestLoginLink("admin@praxis.example", { baseUrl, mailer, db: pool })).toEqual({ kind: "rate_limited" });
    expect(sent).toHaveLength(5);
  });

  it("weist ungültige Adressen zurück", async () => {
    const { mailer } = recordingMailer();
    expect(await requestLoginLink("keine-adresse", { baseUrl, mailer, db: pool })).toEqual({ kind: "invalid_email" });
  });

  it("findet keine abgelaufene Sitzung", async () => {
    const { mailer, sent } = recordingMailer();
    await requestLoginLink("admin@praxis.example", { baseUrl, mailer, db: pool });
    const session = await exchangeLoginToken(tokenFrom(sent[0].link), pool);
    await pool.query("UPDATE sessions SET expires_at = now() - interval '1 second'");
    expect(await findUserBySessionHash(hashToken(session!), pool)).toBeNull();
  });
});
