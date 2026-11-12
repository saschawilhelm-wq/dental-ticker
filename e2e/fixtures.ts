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

  // Zwei ausgewertete Meldungen (Testdaten, keine echte KI-Ausgabe).
  const raws = await pool.query<{ id: string; title: string }>("SELECT id, title FROM raw_items ORDER BY title");
  const facts = {
    affectedness: "direkt", obligation: "pflicht", deadline: "2027-01-31", money: "sanktion",
    bindingness: "in_kraft", roles: ["zahnarzt", "team"], companyNews: false, safety: false,
    fristBeschreibung: "Update einspielen", betroffenheitBegruendung: "Alle Praxen mit TI-Anschluss.",
  };
  const stories: [string, string, number, string, object[]][] = [
    ["published", "Testmeldung: Konnektor-Update wird Pflicht", 92, "bestanden", []],
    ["in_review", "Testmeldung: Neue Punktwerte angekündigt", 55, "abweichung", [{ feld: "frist", aussage: "31.01.2027", problem: "Datum steht nicht in der Quelle." }]],
  ];
  for (const [i, [status, headline, importance, check, issues]] of stories.entries()) {
    const st = await pool.query<{ id: string }>(
      `INSERT INTO stories (status, headline, summary, was_bedeutet_das, handlungsbedarf, frist, category, sicherheit,
                            facts, importance, reasons, check_status, check_issues, ai_checked, published_at)
       VALUES ($1::story_status, $2, 'Erster Satz der Testzusammenfassung. Zweiter Satz. Dritter Satz.',
               'Praxen sollten das einplanen.', 'handeln', '2027-01-31', 'telematik', 'offiziell', $3, $4,
               ARRAY['Pflicht','Frist 31.01.2027'], $5::check_status, $6, $5::text = 'bestanden',
               CASE WHEN $1::story_status = 'published' THEN now() END)
       RETURNING id`,
      [status, headline, JSON.stringify(facts), importance, check, JSON.stringify(issues)],
    );
    await pool.query("INSERT INTO story_sources (story_id, raw_item_id, is_primary) VALUES ($1, $2, true)", [st.rows[0].id, raws.rows[i].id]);
    await pool.query("UPDATE raw_items SET status = 'clustered' WHERE id = $1", [raws.rows[i].id]);
  }
}
