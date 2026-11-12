-- Die Rohdaten-Liste sortiert und filtert nach Veröffentlichung (ersatzweise Abrufzeit).
CREATE INDEX raw_items_effective_date ON raw_items ((COALESCE(published_at, fetched_at)) DESC);
