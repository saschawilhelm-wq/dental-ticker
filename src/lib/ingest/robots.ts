import robotsParser from "robots-parser";

export type RobotsVerdict = {
  allowed: boolean;
  /** Wurde robots.txt gefunden? Fehlt sie (404), ist der Abruf erlaubt. */
  found: boolean;
  crawlDelaySeconds: number | null;
};

/**
 * Bewertet eine robots.txt für eine Ziel-URL. Rein, ohne Netzwerkzugriff.
 *
 * - `status` 2xx: Regeln gelten.
 * - `status` 4xx: keine robots.txt — Abruf erlaubt (übliche Auslegung, RFC 9309).
 * - `status` 5xx oder Netzwerkfehler (null): vorsichtshalber gesperrt (RFC 9309, 2.3.1.4).
 */
export function evaluateRobots(
  robotsUrl: string,
  status: number | null,
  body: string,
  targetUrl: string,
  agent: string,
): RobotsVerdict {
  if (status === null || status >= 500) return { allowed: false, found: false, crawlDelaySeconds: null };
  if (status >= 400) return { allowed: true, found: false, crawlDelaySeconds: null };
  const robots = robotsParser(robotsUrl, body);
  const allowed = robots.isAllowed(targetUrl, agent) ?? true;
  const delay = robots.getCrawlDelay(agent);
  return { allowed, found: true, crawlDelaySeconds: typeof delay === "number" ? delay : null };
}

export function robotsUrlFor(targetUrl: string): string {
  const url = new URL(targetUrl);
  return `${url.protocol}//${url.host}/robots.txt`;
}
