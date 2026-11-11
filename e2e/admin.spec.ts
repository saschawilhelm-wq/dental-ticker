import { createHash, randomBytes } from "node:crypto";
import { Pool } from "pg";
import { loadEnv } from "vite";
import { expect, test, type Page } from "@playwright/test";
import { seedE2E } from "./fixtures";

const env = loadEnv("test", process.cwd(), "");

test.beforeEach(async () => {
  const pool = new Pool({ connectionString: env.TEST_DATABASE_URL });
  try {
    await seedE2E(pool);
  } finally {
    await pool.end();
  }
});

/**
 * Erzeugt direkt in der Testdatenbank einen gültigen Login-Link — so wie ihn
 * die App per E-Mail verschicken würde, ohne einen Mailserver zu brauchen.
 */
async function loginLinkFor(email: string): Promise<string> {
  const pool = new Pool({ connectionString: env.TEST_DATABASE_URL });
  try {
    const token = randomBytes(32).toString("base64url");
    const hash = createHash("sha256").update(token).digest("hex");
    await pool.query(
      `INSERT INTO login_tokens (user_id, token_hash, expires_at)
       SELECT id, $2, now() + interval '15 minutes' FROM users WHERE email = $1`,
      [email, hash],
    );
    return `/login/bestaetigen?token=${token}`;
  } finally {
    await pool.end();
  }
}

async function login(page: Page, email: string) {
  await page.goto(await loginLinkFor(email));
  await page.getByRole("button", { name: "Jetzt anmelden" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

test("ohne Anmeldung führt der Admin-Bereich zur Anmeldung", async ({ page }) => {
  await page.goto("/admin/rohdaten");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("E-Mail-Adresse").fill("unbekannt@example.de");
  await page.getByRole("button", { name: "Anmeldelink anfordern" }).click();
  await expect(page.getByText("Bitte Postfach prüfen.")).toBeVisible();
});

test("Admin meldet sich an, sieht Quellen und filtert Rohdaten", async ({ page }) => {
  await login(page, "admin@praxis.example");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText("Aktive Quellen")).toBeVisible();

  await page.getByRole("link", { name: "Quellen", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Testbehörde" })).toBeVisible();
  await expect(page.getByText("In Ordnung")).toBeVisible();

  await page.goto("/admin/rohdaten");
  await expect(page.getByText("3 Einträge")).toBeVisible();
  await page.getByLabel("Suche im Titel").fill("ePA");
  await page.getByRole("button", { name: "Filtern" }).click();
  await expect(page.getByText("1 Einträge")).toBeVisible();
  await page.getByRole("link", { name: /ePA in Zahnarztpraxen/ }).click();
  await expect(page.getByText("Rohtext 2")).toBeVisible();

  await page.getByRole("button", { name: "Ignorieren" }).click();
  await expect(page.getByRole("button", { name: "Wieder als neu markieren" })).toBeVisible();

  await page.getByRole("button", { name: "Abmelden" }).click();
  await expect(page.getByText("Abgemeldet.")).toBeVisible();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);
});

test("eine neue Quelle wird geprüft und gespeichert", async ({ page }) => {
  await login(page, "admin@praxis.example");
  await page.goto("/admin/quellen/neu");
  await page.getByLabel("Name").fill("BZÄK — Presse");
  await page.getByLabel("Kürzel").fill("Ungültig Mit Leerzeichen");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("Nur Kleinbuchstaben, Ziffern und Bindestriche.")).toBeVisible();
  // Eingaben bleiben nach dem Fehler erhalten.
  await expect(page.getByLabel("Name")).toHaveValue("BZÄK — Presse");

  await page.getByLabel("Kürzel").fill("bzaek-presse");
  await page.getByLabel("Feed-Adresse").fill("https://www.bzaek.de/feed.xml");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("„BZÄK — Presse“ gespeichert.")).toBeVisible();
});

test("ein Konto ohne Admin-Rolle kommt nicht in den Admin-Bereich", async ({ page }) => {
  await login(page, "team@praxis.example");
  await expect(page).toHaveURL(/\/kein-zugang$/);
});
