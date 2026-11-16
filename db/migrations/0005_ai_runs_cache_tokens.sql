-- Zwischengespeicherte Eingabe (Prompt-Caching) wird von input_tokens nicht
-- erfasst. Ohne diese Spalten werden die Kosten zu niedrig ausgewiesen.
ALTER TABLE ai_runs
  ADD COLUMN cache_write_tokens integer,
  ADD COLUMN cache_read_tokens  integer;
