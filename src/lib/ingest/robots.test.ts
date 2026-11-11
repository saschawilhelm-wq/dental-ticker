import { describe, expect, it } from "vitest";
import { evaluateRobots, robotsUrlFor } from "./robots";

const agent = "DentalTickerBot";

// Aufbau wie die robots.txt des RKI (Stand 11.11.2026).
const rkiLike = `User-agent: *
Disallow: /SiteGlobals/
Disallow: /DE/Service/
Allow: /SiteGlobals/Modules/
Crawl-delay: 30
`;

describe("evaluateRobots", () => {
  const robotsUrl = "https://www.rki.de/robots.txt";

  it("sperrt Feeds in gesperrten Pfaden", () => {
    const verdict = evaluateRobots(robotsUrl, 200, rkiLike, "https://www.rki.de/SiteGlobals/Functions/RSS/RSS-Krankenhaushygiene.xml", agent);
    expect(verdict).toEqual({ allowed: false, found: true, crawlDelaySeconds: 30 });
  });

  it("erlaubt andere Pfade und ausdrücklich freigegebene Unterpfade", () => {
    expect(evaluateRobots(robotsUrl, 200, rkiLike, "https://www.rki.de/DE/Aktuelles/rss.xml", agent).allowed).toBe(true);
    expect(evaluateRobots(robotsUrl, 200, rkiLike, "https://www.rki.de/SiteGlobals/Modules/x.xml", agent).allowed).toBe(true);
  });

  it("beachtet Regeln, die nur für unseren Abruf gelten", () => {
    const body = "User-agent: DentalTickerBot\nDisallow: /\n\nUser-agent: *\nAllow: /\n";
    expect(evaluateRobots("https://x.de/robots.txt", 200, body, "https://x.de/feed.xml", agent).allowed).toBe(false);
  });

  it("erlaubt den Abruf, wenn es keine robots.txt gibt", () => {
    expect(evaluateRobots("https://x.de/robots.txt", 404, "", "https://x.de/feed.xml", agent)).toEqual({
      allowed: true,
      found: false,
      crawlDelaySeconds: null,
    });
  });

  it("sperrt vorsichtshalber bei Serverfehler oder nicht erreichbarer robots.txt", () => {
    expect(evaluateRobots("https://x.de/robots.txt", 503, "", "https://x.de/feed.xml", agent).allowed).toBe(false);
    expect(evaluateRobots("https://x.de/robots.txt", null, "", "https://x.de/feed.xml", agent).allowed).toBe(false);
  });
});

describe("robotsUrlFor", () => {
  it("baut die robots.txt-Adresse des Hosts inklusive Port", () => {
    expect(robotsUrlFor("https://www.g-ba.de/beschluesse/rss.xml?x=1")).toBe("https://www.g-ba.de/robots.txt");
    expect(robotsUrlFor("http://localhost:8080/feed")).toBe("http://localhost:8080/robots.txt");
  });
});
