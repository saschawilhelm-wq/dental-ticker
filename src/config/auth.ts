/** Werte für die Anmeldung per Magic Link. Logik dazu liegt in src/lib/auth. */
export const authConfig = {
  sessionCookieName: "dt_session",
  loginTokenTtlMinutes: 15,
  sessionTtlDays: 30,
  /** Höchstens so viele Login-Links pro Person und Zeitfenster. */
  loginRateLimit: { maxRequests: 5, windowMinutes: 15 },
} as const;
