# CLAUDE.md — Arbeitsregeln für dieses Repository

@AGENTS.md

Maßgeblich für alles Fachliche ist **`SPEC.md`**. Abschnitt 1 dort (Entscheidungen) hat Vorrang
vor der ursprünglichen Spezifikation. Neue Entscheidungen werden dort mit Nummer festgehalten.

## Stand

Phase 1 ist abgeschlossen und vom Auftraggeber abgenommen (12.11.2026): Quellenabruf, Datenmodell, Redaktionsbereich, Magic Link. Gearbeitet wird in Phasen;
jede Phase endet mit einer Vorführung und dem Okay des Auftraggebers, bevor die nächste beginnt.

## Befehle

Vor jedem Commit: `npm run lint && npm run typecheck && npm test`.
Bei Änderungen an der Oberfläche zusätzlich `npm run test:e2e`.

## Architekturregeln

1. **`src/config/` enthält nur Werte, `src/lib/` die Logik.** Texte, Grenzen, Wertelisten und
   Startquellen stehen in `config/`. Keine Berechnung in der Konfiguration.
2. **Reine Funktionen, wo möglich.** Parser, Normalisierung, robots-Bewertung und Planung der
   Einträge (`src/lib/ingest/`) sind ohne Netz und Datenbank testbar. Netz, Zeit und Datenbank
   werden als Abhängigkeiten hineingereicht (`IngestDeps`).
3. **Schema nur über Migrationen.** Neue Datei in `db/migrations/` mit fortlaufender Nummer;
   bestehende Migrationen nie ändern.
4. **Jeder Admin-Zugriff prüft `requireAdmin()`** — in jeder Seite und jeder Server Action. Der
   Proxy ist nur eine Vorprüfung.
5. **Markenwerte nur in `src/config/site.ts` und den CSS-Variablen in `globals.css`.** Der Stand ist
   bewusst neutral (SPEC E-01).

## Verbote

- Keine Volltexte oder längeren Zitate aus Fachpresse für Nutzer speichern oder anzeigen.
- Keine Quelle abrufen, deren robots.txt den Pfad sperrt. Kein HTML-Scraping ohne geprüfte Erlaubnis.
- Login-Links und Token nie im Produktivbetrieb loggen.
- Keine Inhalte aus Quellen als HTML rendern — immer als Text.
- Keine personenbezogenen Daten in Anfragen an Quellen (User-Agent ohne private Kontaktadresse).

## Gestaltung

- Farbe ist nie alleiniger Bedeutungsträger: Status trägt immer Text und Symbol (`Badge`).
- Touch-Ziele mindestens 44 × 44 px (`min-h-11`), sichtbarer Tastaturfokus, Ziel WCAG 2.1 AA.
- Oberfläche auf Deutsch, Datumsangaben in deutscher Zeit (`src/lib/format.ts`).

## Next.js 16 mit Cache Components

Laufzeitdaten (Cookies, `searchParams`, `params`, Datenbank) gehören in eine Komponente innerhalb
von `<Suspense>`. Seiten selbst bleiben synchron; der Build bricht sonst ab. Vor neuen Mustern die
Doku unter `node_modules/next/dist/docs/` lesen.
