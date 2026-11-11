-- Row-Level-Security auf allen Tabellen einschalten, ohne Policies.
--
-- Die App greift ausschließlich serverseitig als Eigentümer der Tabellen zu und
-- ist von RLS nicht betroffen. Läuft die Datenbank bei Supabase, sperrt das die
-- automatisch erzeugte Daten-API (Rollen anon/authenticated) vollständig. Ohne
-- diese Migration wären dort alle Tabellen mit dem öffentlichen Schlüssel lesbar.

ALTER TABLE sources           ENABLE ROW LEVEL SECURITY;
ALTER TABLE fetch_runs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_sources     ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_role_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferences       ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_tokens      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions          ENABLE ROW LEVEL SECURITY;
