-- Dental-Ticker — Grundschema Phase 1
-- Läuft auf jedem Postgres ab Version 15 (lokal wie bei Supabase in der EU).
-- pgvector (Embeddings) kommt erst mit Phase 2 in einer eigenen Migration.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- Aufzählungen
-- ---------------------------------------------------------------------------

CREATE TYPE role_type AS ENUM ('zahnarzt', 'praxismanagement', 'team', 'labor', 'industrie');

CREATE TYPE category AS ENUM (
  'recht_politik', 'abrechnung', 'telematik', 'hygiene_mp',
  'wissenschaft', 'praxisfuehrung', 'markt_industrie', 'standespolitik'
);

-- AT und CH sind vorgesehen, werden zum Start aber nicht befüllt (nur Deutschland).
CREATE TYPE country AS ENUM ('DE', 'AT', 'CH', 'EU');

CREATE TYPE fetch_method AS ENUM ('rss', 'api', 'html', 'manual');
CREATE TYPE trust_level  AS ENUM ('A', 'B');
CREATE TYPE source_kind  AS ENUM ('primary', 'press', 'science');

CREATE TYPE action_level AS ENUM ('keiner', 'beobachten', 'handeln');
CREATE TYPE certainty    AS ENUM ('offiziell', 'berichtet', 'unbestaetigt');
CREATE TYPE story_status AS ENUM ('draft', 'in_review', 'published', 'blocked', 'archived');
CREATE TYPE raw_status   AS ENUM ('new', 'clustered', 'ignored', 'error');

CREATE TYPE app_role     AS ENUM ('user', 'editor', 'admin');

CREATE TYPE fetch_run_status AS ENUM (
  'running', 'ok', 'not_modified', 'blocked_robots', 'error'
);

-- ---------------------------------------------------------------------------
-- Quellen und Abruf
-- ---------------------------------------------------------------------------

CREATE TABLE sources (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text NOT NULL,
  slug                 text NOT NULL UNIQUE,
  homepage_url         text,
  feed_url             text,
  fetch_method         fetch_method NOT NULL DEFAULT 'rss',
  fetch_interval_min   integer NOT NULL DEFAULT 60 CHECK (fetch_interval_min BETWEEN 5 AND 10080),
  trust_level          trust_level NOT NULL,
  kind                 source_kind NOT NULL,
  country              country NOT NULL DEFAULT 'DE',
  language             text NOT NULL DEFAULT 'de',
  is_active            boolean NOT NULL DEFAULT true,
  terms_note           text,
  robots_checked_at    timestamptz,
  robots_allowed       boolean,
  etag                 text,
  last_modified        text,
  last_fetched_at      timestamptz,
  last_success_at      timestamptz,
  consecutive_failures integer NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feed_url_required CHECK (fetch_method = 'manual' OR feed_url IS NOT NULL)
);

CREATE TABLE fetch_runs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id   uuid NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status      fetch_run_status NOT NULL DEFAULT 'running',
  http_status integer,
  items_seen  integer NOT NULL DEFAULT 0,
  items_new   integer NOT NULL DEFAULT 0,
  error       text
);
CREATE INDEX fetch_runs_source_started ON fetch_runs (source_id, started_at DESC);
CREATE INDEX fetch_runs_started ON fetch_runs (started_at DESC);

-- ---------------------------------------------------------------------------
-- Rohdaten
-- ---------------------------------------------------------------------------

CREATE TABLE raw_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id      uuid NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  external_guid  text,
  url            text NOT NULL,
  url_normalized text NOT NULL,
  title          text NOT NULL,
  published_at   timestamptz,
  fetched_at     timestamptz NOT NULL DEFAULT now(),
  -- Rohtext nur für die interne Analyse. Bei Fachpresse wird er nach
  -- purge_after gelöscht; angezeigt wird er Nutzern nie.
  raw_text       text,
  content_hash   text NOT NULL,
  language       text,
  status         raw_status NOT NULL DEFAULT 'new',
  purge_after    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, url_normalized)
);
CREATE INDEX raw_items_fetched ON raw_items (fetched_at DESC);
CREATE INDEX raw_items_source_published ON raw_items (source_id, published_at DESC);
CREATE INDEX raw_items_status ON raw_items (status);
CREATE INDEX raw_items_title_trgm ON raw_items USING gin (title gin_trgm_ops);
CREATE INDEX raw_items_purge ON raw_items (purge_after) WHERE purge_after IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Stories (ein Ereignis, ggf. aus mehreren Quellen) — befüllt ab Phase 2
-- ---------------------------------------------------------------------------

CREATE TABLE stories (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status           story_status NOT NULL DEFAULT 'draft',
  headline         varchar(90),
  summary          text,
  was_bedeutet_das text,
  handlungsbedarf  action_level,
  frist            date,
  category         category,
  country          country NOT NULL DEFAULT 'DE',
  sicherheit       certainty,
  locked_by_admin  boolean NOT NULL DEFAULT false,
  first_seen_at    timestamptz NOT NULL DEFAULT now(),
  published_at     timestamptz,
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stories_status_published ON stories (status, published_at DESC);
CREATE INDEX stories_frist ON stories (frist) WHERE frist IS NOT NULL;

CREATE TABLE story_sources (
  story_id    uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  raw_item_id uuid NOT NULL REFERENCES raw_items(id) ON DELETE CASCADE,
  is_primary  boolean NOT NULL DEFAULT false,
  position    integer NOT NULL DEFAULT 0,
  PRIMARY KEY (story_id, raw_item_id)
);
CREATE INDEX story_sources_raw_item ON story_sources (raw_item_id);

CREATE TABLE story_role_scores (
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  role     role_type NOT NULL,
  score    smallint NOT NULL CHECK (score BETWEEN 0 AND 100),
  PRIMARY KEY (story_id, role)
);
CREATE INDEX story_role_scores_role ON story_role_scores (role, score DESC);

-- ---------------------------------------------------------------------------
-- Nutzer, Einstellungen, Anmeldung
-- ---------------------------------------------------------------------------

CREATE TABLE users (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email        text NOT NULL,
  display_name text,
  role         role_type,
  app_role     app_role NOT NULL DEFAULT 'user',
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_lowercase CHECK (email = lower(email))
);
CREATE UNIQUE INDEX users_email ON users (email);

CREATE TABLE preferences (
  user_id        uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  categories     category[] NOT NULL DEFAULT '{}',
  countries      country[] NOT NULL DEFAULT '{DE}',
  briefing_push  boolean NOT NULL DEFAULT false,
  briefing_email boolean NOT NULL DEFAULT true,
  briefing_time  time NOT NULL DEFAULT '07:00',
  timezone       text NOT NULL DEFAULT 'Europe/Berlin',
  push_threshold smallint NOT NULL DEFAULT 80 CHECK (push_threshold BETWEEN 0 AND 100),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Magic-Link-Token: gespeichert wird nur der SHA-256-Hash, nie das Token selbst.
CREATE TABLE login_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX login_tokens_user_created ON login_tokens (user_id, created_at DESC);

CREATE TABLE sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   text NOT NULL UNIQUE,
  expires_at   timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user ON sessions (user_id);
