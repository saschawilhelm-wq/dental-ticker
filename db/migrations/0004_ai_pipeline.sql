-- Phase 2: KI-Pipeline (Analyse, Bewertung, Prüfung, Review-Warteschlange).

-- Kategorien nach SPEC 1.1: GKV/PKV und Fortbildung als eigene Kategorien.
ALTER TYPE category ADD VALUE IF NOT EXISTS 'gkv_pkv' AFTER 'recht_politik';
ALTER TYPE category ADD VALUE IF NOT EXISTS 'fortbildung' AFTER 'markt_industrie';

-- Prüfergebnis des zweiten KI-Durchlaufs.
CREATE TYPE check_status AS ENUM ('offen', 'bestanden', 'abweichung');

-- Rohdaten: Grund, warum ein Eintrag aussortiert wurde, und Fehlversuche.
ALTER TABLE raw_items
  ADD COLUMN ignore_reason   text,
  ADD COLUMN analysis_attempts smallint NOT NULL DEFAULT 0;

-- Quellen aus dem Netzwerk (SPEC E-16) werden offen gekennzeichnet.
ALTER TABLE sources
  ADD COLUMN is_network boolean NOT NULL DEFAULT false;

-- Stories: Fakten der KI, errechnete Wichtigkeit, Begründung und Prüfung.
ALTER TABLE stories
  ADD COLUMN facts             jsonb,
  ADD COLUMN importance        smallint CHECK (importance BETWEEN 0 AND 100),
  ADD COLUMN reasons           text[] NOT NULL DEFAULT '{}',
  ADD COLUMN termin            date,
  ADD COLUMN is_company_news   boolean NOT NULL DEFAULT false,
  ADD COLUMN check_status      check_status NOT NULL DEFAULT 'offen',
  ADD COLUMN check_issues      jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN ai_checked        boolean NOT NULL DEFAULT false,
  ADD COLUMN analysis_version  text,
  ADD COLUMN reviewed_by       uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN reviewed_at       timestamptz,
  ADD COLUMN review_note       text,
  -- Erneute Analyse angefordert (z. B. aus dem Admin).
  ADD COLUMN reanalyze         boolean NOT NULL DEFAULT false;

CREATE INDEX stories_importance ON stories (status, importance DESC NULLS LAST);
CREATE INDEX stories_review ON stories (first_seen_at) WHERE status = 'in_review';
CREATE INDEX stories_headline_trgm ON stories USING gin (headline gin_trgm_ops);

-- Jede KI-Ausgabe wird mit Prompt-Version und Modell gespeichert (Pflicht laut SPEC).
CREATE TABLE ai_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind            text NOT NULL CHECK (kind IN ('analyse', 'pruefung')),
  raw_item_id     uuid REFERENCES raw_items(id) ON DELETE SET NULL,
  story_id        uuid REFERENCES stories(id) ON DELETE SET NULL,
  model_requested text NOT NULL,
  model_served    text,
  prompt_version  text NOT NULL,
  input_hash      text NOT NULL,
  output          jsonb,
  stop_reason     text,
  input_tokens    integer,
  output_tokens   integer,
  error           text,
  duration_ms     integer,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_runs_created ON ai_runs (created_at DESC);
CREATE INDEX ai_runs_story ON ai_runs (story_id);
CREATE INDEX ai_runs_raw_item ON ai_runs (raw_item_id);

-- Einschätzung der Redaktion zur Kalibrierung (SPEC 1.1): ein Mensch bewertet,
-- die Übereinstimmung mit der KI wird gemessen.
CREATE TABLE editor_assessments (
  story_id    uuid PRIMARY KEY REFERENCES stories(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  relevant    boolean NOT NULL,
  importance  text NOT NULL CHECK (importance IN ('hoch', 'mittel', 'niedrig')),
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_runs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE editor_assessments ENABLE ROW LEVEL SECURITY;
