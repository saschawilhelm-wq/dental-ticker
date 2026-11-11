# Dental-Ticker

Täglicher Nachrichtenticker für die Dental-Branche in Deutschland: was sich heute geändert hat
und was es für die Praxis bedeutet. Produktbeschreibung und Entscheidungen: [`SPEC.md`](SPEC.md).

## Stand: Phase 1

Fertig ist das Fundament für alles Weitere:

- **Datenmodell** für Quellen, Rohdaten, Stories, Nutzer und Einstellungen (`db/migrations`)
- **Quellenabruf** per RSS/Atom mit robots.txt-Prüfung, bedingten Anfragen (ETag), Duplikatschutz,
  Zeichensatz-Erkennung, Größen- und Zeitgrenzen sowie Protokoll jedes Abrufs
- **Drei Primärquellen** aktiv: G-BA Beschlüsse, G-BA Pressemitteilungen, gematik Newsroom
- **Admin-Bereich** mit Übersicht, Quellenverwaltung („Jetzt abrufen“), Rohdaten mit Filtern und
  Abrufprotokoll
- **Anmeldung per Magic Link** (ohne Passwort, nur für angelegte Konten)
- PWA-Manifest (installierbar). Push und Service Worker folgen in Phase 3.

Noch **nicht** enthalten (laut Phasenplan): KI-Analyse, Bündelung, Review-Warteschlange (Phase 2),
Nutzer-Feed, Briefing, Fristen-Kalender (Phase 3), Audio-Briefing (Phase 3b).

## Lokaler Start

Voraussetzungen: Node.js ≥ 22 und ein Postgres ≥ 15.

```bash
npm install
cp .env.example .env.local        # Verbindungsdaten anpassen
npm run db:migrate                # Tabellen anlegen
npm run db:seed                   # Startquellen anlegen
npm run admin:create -- name@example.de
npm run worker -- --once          # Quellen einmal abrufen
npm run dev                       # http://localhost:3000/admin
```

Beim Anmelden erscheint der Login-Link in der Entwicklung **im Terminal** von `npm run dev`
(E-Mail-Versand folgt in Phase 3). Im Produktivbetrieb wird der Link nie ins Log geschrieben;
ohne eingerichteten Versand schlägt die Anmeldung dort mit einer klaren Meldung fehl.

Für den Dauerbetrieb läuft der Worker als eigener Prozess: `npm run worker`. Er schaut jede
Minute nach fälligen Quellen. Mehrere Worker stören sich nicht (Reservierung per `SKIP LOCKED`).

## Befehle

| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklungsserver |
| `npm run build` / `npm start` | Produktionsbündel bauen / starten |
| `npm run worker` | Abruf-Worker (dauerhaft; `-- --once` für einen Durchlauf) |
| `npm run db:migrate` | offene Migrationen einspielen |
| `npm run db:seed` | Startquellen anlegen bzw. aktualisieren |
| `npm run admin:create -- <E-Mail>` | Admin-Konto anlegen |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (strikt) |
| `npm test` | Unit- und Integrationstests (Vitest) |
| `npm run test:e2e` | Browser-Tests (Playwright, Desktop und Mobil) |

Die Integrations- und Browser-Tests brauchen eine **eigene** Testdatenbank in
`TEST_DATABASE_URL`. Sie wird bei jedem Lauf geleert. Ohne diese Variable werden die
Datenbanktests übersprungen.

## Aufbau

```
db/migrations/        SQL-Migrationen (Quelle der Wahrheit fürs Schema)
src/config/           nur Werte: Marke, Wertelisten, Grenzen, Startquellen
src/lib/ingest/       Abruf: Parser, Normalisierung, robots.txt, Ablauf
src/lib/db/           Datenbankzugriff
src/lib/auth/         Magic Link und Sitzungen
src/lib/validation/   Formular- und Filterprüfung
src/app/              Oberfläche (Next.js App Router)
worker/               Abruf-Worker
scripts/              Migration, Startdaten, Admin anlegen
test/, e2e/           Fixtures, Integrations- und Browser-Tests
```

## Sicherheit und Recht in Phase 1

- robots.txt wird vor jedem Abruf geprüft; gesperrte Pfade werden nicht abgerufen.
- Rohtexte sind nur im Admin sichtbar und werden nie als HTML ausgegeben. Bei Fachpresse werden
  sie nach 30 Tagen gelöscht (vorläufiger Wert, siehe unten).
- Login-Token (15 Minuten, einmalig) und Sitzungen liegen nur gehasht in der Datenbank. Der Link
  aus der E-Mail verlangt einen zusätzlichen Klick, damit Mail-Scanner ihn nicht verbrauchen.
- Row-Level-Security ist auf allen Tabellen aktiv. Damit ist bei Supabase die öffentliche Daten-API
  gesperrt; die App greift nur serverseitig zu.

## Offene Punkte vor einem Livegang

- [ ] E-Mail-Versand für Login-Links einrichten (Anbieter mit EU-Datenhaltung)
- [ ] Hosting und Datenbank festlegen (Vorschlag: Supabase Frankfurt + Vercel `fra1` + Worker-Container in der EU)
- [ ] Kennung des Abrufs (`ingestConfig.userAgent`) um eine Projekt-URL ergänzen
- [ ] Löschfrist für Fachpresse-Rohtexte (30 Tage) rechtlich bestätigen (§ 44b UrhG, AGB je Quelle)
- [ ] RKI um Freigabe der RSS-Feeds bitten (robots.txt sperrt `/SiteGlobals/`)
- [ ] Für BfArM, BZÄK, KZBV klären: RSS vorhanden, Scraping erlaubt, oder manuelle Pflege
- [ ] Impressum und Datenschutzerklärung
