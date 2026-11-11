import type { Pool } from "pg";

/** Leert die Testdaten und legt eine Quelle, drei Einträge und zwei Konten an. */
export async function seedE2E(pool: Pool): Promise<void> {
  await pool.query("TRUNCATE sources, users CASCADE");
  const source = await pool.query<{ id: string }>(
    `INSERT INTO sources (name, slug, feed_url, trust_level, kind, last_success_at)
     VALUES ('Testbehörde', 'testbehoerde', 'https://behoerde.example/feed.xml', 'A', 'primary', now())
     RETURNING id`,
  );
  const sourceId = source.rows[0].id;
  for (let i = 1; i <= 3; i++) {
    await pool.query(
      `INSERT INTO raw_items (source_id, url, url_normalized, title, published_at, raw_text, content_hash)
       VALUES ($1, $2, $2, $3, now() - make_interval(hours => $4), $5, $6)`,
      [sourceId, `https://behoerde.example/n/${i}`, `Meldung ${i}: ${i === 2 ? "ePA in Zahnarztpraxen" : "Beschluss"}`, i, `Rohtext ${i}`, `hash-${i}`],
    );
  }
  await pool.query("INSERT INTO users (email, app_role) VALUES ('admin@praxis.example', 'admin'), ('team@praxis.example', 'user')");
}
