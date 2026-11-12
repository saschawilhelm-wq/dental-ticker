# SPEC — Dental-Ticker (Arbeitstitel)

Maßgebliche Produktbeschreibung. Abschnitt 1 enthält die getroffenen Entscheidungen,
Abschnitt 2 die ursprüngliche Spezifikation. Bei Widersprüchen gilt Abschnitt 1.

---

## 1. Entscheidungen (Stand 12.11.2026)

| Nr. | Frage | Entscheidung |
|---|---|---|
| E-01 | Für wen wird gebaut? | Zunächst **neutral**, ohne Partner-Branding. Name, Texte und Farben liegen zentral in `src/config/site.ts` und `src/app/globals.css`, damit ein späteres Branding nur dort ansetzt. |
| E-02 | Nur Deutschland oder DACH? | **Nur Deutschland** zum Start. AT und CH bleiben im Datenmodell (Enum `country`) vorgesehen, werden aber nicht befüllt. |
| E-03 | Wer prüft die Review-Warteschlange? | **Zunächst Claude (KI-Prüfung)**, bald ein Mensch. Die Warteschlange wird so gebaut, dass ein Mensch ohne Umbau übernehmen kann. Vorgeschlagene Absicherung für Phase 2: Kennzeichnung „KI-geprüft“; wenn Zahlen, Daten oder Fristen nicht eindeutig in der Quelle stehen, geht die Meldung nicht live. |
| E-04 | Geldmodell | **Offen.** Betrifft erst Phase 4. |
| E-05 | Audio-Briefing | **KI-Stimme.** Eine geklonte Stimme einer realen Person („Klaus“) ist möglich, setzt aber deren ausdrückliche schriftliche Einwilligung voraus. Der TTS-Anbieter wird austauschbar gebaut; Auswahl in Phase 3b. |
| E-06 | Datenbank | **Postgres ohne Anbieterbindung.** Die App spricht über `DATABASE_URL` mit jedem Postgres ≥ 15. Supabase (Region Frankfurt) bleibt der vorgesehene Betrieb, ist aber nicht Voraussetzung für die Entwicklung. |
| E-07 | Anmeldung | **Eigener Magic-Link-Login** statt Supabase Auth: lokal testbar, ohne Anbieterbindung. Token und Sitzungen liegen nur als SHA-256-Hash in der Datenbank. Abweichung vom Technik-Vorschlag, begründet durch E-06. |
| E-08 | Jobs | **Eigener Node-Worker** (`worker/index.ts`) statt Supabase Edge Functions — wegen Laufzeitgrenzen und weil Phase 3b ffmpeg braucht. |
| E-09 | Startquellen | G-BA Beschlüsse, G-BA Pressemitteilungen, gematik Newsroom (alle RSS, geprüft). RKI-Feeds liegen unter einem per robots.txt gesperrten Pfad und bleiben inaktiv, bis das RKI zustimmt. BfArM, BZÄK und KZBV bieten kein auffindbares RSS. |
| E-10 | Themenbreite | Alles, was für den **Dentalbereich** relevant ist: Praxis, Labor, **Dental-Industrie und -Handel** (z. B. Straumann, Nobel Biocare, Depots), **Abrechnungsdienstleister**, **Messen und Fortbildungen**, dazu **Gesundheitspolitik in GKV und PKV**, verständlich aufgeschlüsselt. Rein ärztliche Themen ohne Bezug zur Zahnmedizin fallen heraus. |
| E-12 | Podcast-Empfehlung | Der Praxismarketing-Podcast von parsmedia erscheint als **dezente Empfehlung**: ein ruhiger Platz am Ende des Tages-Feeds bzw. der Detailseite und ein Satz im Outro des Wochen-Audio-Briefings — nie zwischen den Meldungen, nie als Push. Gekennzeichnet als „Empfehlung in eigener Sache“. Die Empfehlung beeinflusst **keine** Sortierung oder Gewichtung. Inhalt (Name, Link, Text) liegt austauschbar in der Konfiguration, damit ein späteres White-Label eine eigene Empfehlung setzen kann. Umsetzung mit dem Nutzer-Feed in Phase 3 bzw. 3b. Offen: genauer Name, Link und Kurztext des Podcasts. |
| E-11 | Gestaltung | Warm, ruhig, einladend; nichts soll beim Lesen hetzen. Leinenfarbener Grund, Creme statt Reinweiß, leichte Papieroptik, Serifenschrift für Überschriften. Festgelegt in `src/app/globals.css`. |

### 1.1 Vorschlag: Wie Wichtigkeit entsteht (Grundlage für Phase 2, noch zu bestätigen)

Die KI vergibt **keine freie Wichtigkeitszahl**. Sie beantwortet je Meldung feste, nachprüfbare Fragen;
die Wichtigkeit errechnet der Code daraus nach festen, dokumentierten Gewichten. Gleiche Antworten
ergeben immer dieselbe Sortierung.

**Fragen an die KI (Auszug):** Betrifft es Zahnarztpraxen direkt, indirekt oder nicht? Pflicht oder
Information? Frist (Datum)? Geht es um Geld (Honorar, Punktwert, Kosten, Sanktion)? Verbindlichkeit
(Entwurf, beschlossen, in Kraft)? Welche Rollen sind betroffen? Ist es eine Unternehmens- oder
Werbemeldung?

**Gewichtung (Richtung, Zahlen werden gemeinsam festgelegt):**

| Merkmal | Wirkung |
|---|---|
| Pflicht mit Frist für Praxen | stark nach oben |
| Honorar, BEMA, GOZ, Punktwerte | nach oben, besonders für Praxismanagement/Abrechnung |
| In Kraft statt Entwurf | nach oben |
| Primärquelle statt Presse | nach oben |
| Unternehmens- oder Produktmeldung | nach unten, außer Rückruf, Lieferengpass, Preisänderung |
| Kein Bezug zur Zahnmedizin | fällt heraus |

**Sichtbare Begründung:** Jede Meldung trägt eine Kurzbegründung („Pflicht · Frist 31.03. · betrifft
Abrechnung“), für Leser und Prüfer.

**Kalibrierung vor Livegang:** Ein Mensch bewertet rund 50 echte Meldungen. Die KI geht erst allein
live, wenn sie ausreichend oft dasselbe Ergebnis erzielt. Korrekturen der Redaktion werden gespeichert
und fließen in die Gewichte ein.

**Kategorien (Vorschlag):** Gesundheitspolitik GKV & PKV getrennt von allgemeinem Recht; eigene
Kategorie „Fortbildung & Veranstaltungen“ (Termine zusätzlich im Kalender); „Industrie & Handel“ für
Hersteller, Depots und Abrechnungsdienstleister.

**Gesetzes-Radar:** Gesetzesvorhaben als ein Vorgang mit Stand (Referentenentwurf → Kabinett →
Bundestag → Bundesrat → in Kraft) statt verstreuter Einzelmeldungen; Quelle u. a. die offizielle
DIP-Schnittstelle des Bundestags.

**Neutralität:** Unternehmensmeldungen werden als solche gekennzeichnet und niedriger gewichtet.
Veranstalter können Termine später selbst einreichen, statt dass ihre Seiten ausgelesen werden.

### 1.2 Geprüfte Quellenkandidaten

| Kandidat | Ergebnis der Prüfung (12.11.2026) |
|---|---|
| dentastico (Hannover), Abrechnungsdienstleister | WordPress-Blog mit RSS-Feed, robots.txt erlaubt den Abruf. Seltene Beiträge (letzter echter Beitrag 2023). Kommerzieller Anbieter: nur als gekennzeichnete Unternehmens- bzw. Fachquelle. |
| Straumann Group (Schweiz) | Website blockiert automatische Abrufe (HTTP 403). Kein automatischer Abruf; offiziellen Presseverteiler klären oder manuell pflegen. Produktrückrufe für Deutschland kommen ohnehin über das BfArM. |

---

## 2. Ursprüngliche Spezifikation

### Produktidee in einem Satz

Ein täglicher, KI-kuratierter Nachrichtenticker für die Dental-Branche im DACH-Raum, der Zahnärzten, Praxisteams, Laboren und Dental-Industrie in 2 Minuten zeigt, was sich heute geändert hat und was es für ihre Praxis bedeutet.

### Zielgruppen (Rollen im Profil wählbar)

1. Zahnarzt/Zahnärztin (Praxisinhaber, angestellt)
2. Praxismanagement / Abrechnung
3. ZFA / ZMF / DH (Team)
4. Zahntechnisches Labor
5. Dental-Industrie / Depots / Agenturen

Jede Meldung bekommt pro Rolle einen Relevanz-Score, damit der Feed je Rolle anders sortiert ist.

### Themen-Kategorien

- Recht & Politik (Gesetze, Verordnungen, G-BA-Beschlüsse, Budgetierung, GKV-Finanzen)
- Abrechnung (BEMA, GOZ, Punktwerte, Analogberechnung, Urteile)
- Telematik & Digitalisierung (TI, ePA, eRezept, KIM, gematik-Fristen, Sanktionen)
- Hygiene & Medizinprodukte (RKI/KRINKO, Rückrufe, Sicherheitswarnungen BfArM, MDR)
- Wissenschaft & Leitlinien (neue AWMF-Leitlinien, relevante Studien)
- Praxisführung (Personal, Fachkräftemangel, Arbeitsrecht, Datenschutz, Steuern)
- Markt & Industrie (Produkte, Übernahmen, Messen wie IDS, Fortbildungen)
- Standespolitik (BZÄK, KZBV, Kammern, KZVen, Wahlen)

### Quellen (Startliste, erweiterbar über Admin)

**Primärquellen (höchste Priorität, Vertrauensstufe A):**
- Bundeszahnärztekammer (BZÄK), KZBV, Landeszahnärztekammern, KZVen
- G-BA (Beschlüsse, Richtlinien), BMG, Bundesgesetzblatt, Bundestag (Drucksachen, Ausschüsse)
- BfArM (Rückrufe, Kundeninfos Medizinprodukte), RKI/KRINKO
- gematik (TI-Fristen, Störungsmeldungen)
- AWMF-Leitlinienregister, DGZMK und Fachgesellschaften
- Österreich: ÖZÄK, Sozialversicherung; Schweiz: SSO, BAG

**Fachpresse (Vertrauensstufe B, nur Teaser + Link, kein Volltext):**
- zm online, DZW, ZWP online, Dental Tribune, Quintessenz-News u.ä.

**Wissenschaft (Vertrauensstufe B):**
- PubMed-Abfragen auf definierte Dental-Journals (z.B. J Dent Res, Clin Oral Investig, J Clin Periodontol)

**Regel:** Pro Quelle hinterlegen: URL, Abrufart (RSS, API, HTML-Scrape), Abrufintervall, Vertrauensstufe, Land, Sprache. Robots.txt und Nutzungsbedingungen respektieren. Wo Scraping nicht erlaubt ist, nur RSS oder manuelles Einpflegen.

### Verarbeitungs-Pipeline (das Herzstück)

1. **Abruf** (Cron, z.B. alle 30 Min. für Primärquellen, stündlich für Presse)
2. **Normalisieren** (Titel, Datum, Quelle, URL, Rohtext für die interne Analyse)
3. **Duplikate erkennen** (gleiches Ereignis aus mehreren Quellen zu einer "Story" bündeln, per Embedding-Ähnlichkeit + Titelabgleich)
4. **KI-Analyse pro Story** (LLM, z.B. Claude API), Ausgabe als festes JSON:
   - `headline` (max. 90 Zeichen, sachlich, keine Clickbait-Formulierung)
   - `summary` (3 Sätze, eigene Worte, keine wörtlichen Übernahmen aus der Presse)
   - `was_bedeutet_das` (1 bis 2 Sätze: konkrete Auswirkung auf die Praxis)
   - `handlungsbedarf` (`keiner` | `beobachten` | `handeln`, mit Frist falls vorhanden)
   - `kategorie`, `land` (DE/AT/CH), `rollen_relevanz` (0 bis 100 je Rolle)
   - `quellen` (Liste mit Links, Primärquelle zuerst)
   - `sicherheit` (wie belastbar: `offiziell` | `berichtet` | `unbestätigt`)
5. **Qualitätsprüfung**: zweiter LLM-Durchlauf prüft die Zusammenfassung gegen den Quelltext auf Fakten, Zahlen und Daten. Bei Abweichung: Meldung in eine Review-Warteschlange statt live.
6. **Veröffentlichen** in den Feed, Push nur bei `handlungsbedarf = handeln` oder Score über Schwelle.

### Funktionen MVP (Phase 1 bis 3)

- Feed "Heute" (sortiert nach Rolle und Relevanz), Filter nach Kategorie und Land
- Detailansicht mit Zusammenfassung, "Was bedeutet das für mich", Quellenlinks
- Tagesbriefing: um 7:00 Uhr Push + optional E-Mail mit den Top 5
- Fristen-Kalender: alle Meldungen mit Frist (z.B. TI-Updates, Antragsfristen) als Liste, Export als .ics
- Merken/Teilen (Link an Kollegen, WhatsApp-Teilen)
- Admin-Bereich: Quellen verwalten, Review-Warteschlange, Meldungen manuell bearbeiten/sperren
- Login per E-Mail (Magic Link)
- **Wochen-Audio-Briefing (Alleinstellungsmerkmal, Pflicht im MVP):**
  - Jeden Freitag automatisch ein Skript (ca. 5 Minuten, ca. 700 Wörter) aus den Top-Meldungen der Woche, Sprechtext statt Lesetext: kurze Sätze, keine Klammern, Zahlen ausgeschrieben, Abkürzungen beim ersten Mal aufgelöst
  - Skript landet im Admin zur Freigabe und Bearbeitung, bevor Audio erzeugt wird
  - Zwei Wege zur Audiodatei: (a) KI-Stimme per TTS-API, (b) Upload einer selbst eingesprochenen und gemasterten Datei (MP3/M4A), die die KI-Version ersetzt
  - Intro/Outro-Jingle als hochladbare Audio-Bausteine, automatisch vor/nach dem Sprechtext gesetzt; Zielpegel -16 LUFS (Stereo) bzw. -19 LUFS (Mono), True Peak max. -1 dBTP
  - In der App: Player mit Kapitelmarken je Meldung, Geschwindigkeit 1x/1,25x/1,5x, Hintergrundwiedergabe
  - Zusätzlich RSS-Podcast-Feed (privat pro Nutzer-Token), damit das Briefing in jeder Podcast-App läuft
  - Shownotes automatisch aus den Meldungen inkl. Quellenlinks

### Später (Phase 4+), nicht jetzt bauen

- Mehrmandantenfähigkeit / White-Label (eigenes Logo, eigene Farben für Partner wie Agenturen, Depots, Kammern)
- Bezahlmodelle (Einzelpraxis-Abo, Team-Lizenz, Partner-Lizenz)
- Native Apps (iOS/Android) über Capacitor oder React Native
- KI-Chat "Frag den Ticker" über das Archiv (mit Quellenangaben)

### Technik-Vorschlag

- Frontend: Next.js (App Router) + TypeScript + Tailwind, als PWA (installierbar, Push)
- Backend/DB: Supabase (Postgres, Auth, Storage) mit pgvector für Duplikaterkennung
- Jobs: Cron-Worker (z.B. Supabase Edge Functions oder separater Node-Worker)
- KI: Claude API für Analyse und Qualitätsprüfung; Prompts versioniert im Repo unter `/prompts`
- Push: Web Push (VAPID); E-Mail: Resend o.ä.
- Hosting: Vercel oder vergleichbar, Datenhaltung in der EU
- Tests: Unit-Tests für Parser und JSON-Schema, ein End-to-End-Test für den Feed

(Abweichungen siehe E-06 bis E-08.)

### Rechtliches und Qualität (Pflicht)

- Keine Volltexte oder längeren Zitate aus Fachpresse speichern oder anzeigen; nur eigene Zusammenfassung + Link
- Jede Meldung zeigt Quelle und Abrufzeit; KI-Zusammenfassungen sind als solche gekennzeichnet
- Hinweis: keine Rechts-, Abrechnungs- oder Therapieberatung; bei Handlungsbedarf auf Primärquelle verweisen
- DSGVO: Datenhaltung EU, Impressum, Datenschutzerklärung, Auftragsverarbeitung mit KI-Anbieter prüfen
- Logging: Jede KI-Ausgabe mit Prompt-Version und Modell speichern, damit Fehler nachvollziehbar sind

### Vorgehen in Phasen

1. **Phase 1:** Projekt-Setup, Datenmodell (sources, raw_items, stories, story_sources, users, preferences), 3 Primärquellen per RSS anbinden, Rohdaten sichtbar im Admin
2. **Phase 2:** KI-Pipeline (Bündeln, Analyse-JSON, Qualitätsprüfung, Review-Warteschlange)
3. **Phase 3:** Nutzer-Feed, Rollen, Filter, Tagesbriefing per Push/E-Mail, Fristen-Kalender
3b. **Phase 3b:** Wochen-Audio-Briefing (Skript-Generierung, Freigabe, TTS oder Upload, Jingles, Loudness-Normalisierung per ffmpeg, Player, privater Podcast-RSS-Feed)
4. **Phase 4:** Weitere Quellen, Feinschliff, Vorbereitung White-Label und Bezahlung
