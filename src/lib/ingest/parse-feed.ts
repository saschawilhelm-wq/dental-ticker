import { decode as decodeEntities } from "he";
import { XMLParser } from "fast-xml-parser";

/** Ein Eintrag, wie er im Feed steht — noch nicht normalisiert. */
export type FeedEntry = {
  title: string;
  link: string | null;
  guid: string | null;
  published: string | null;
  /** HTML oder Text, so wie die Quelle ihn liefert. */
  body: string | null;
};

export type ParsedFeed = {
  format: "rss2" | "atom" | "rss1";
  title: string | null;
  entries: FeedEntry[];
};

export class FeedParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeedParseError";
  }
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  // Entitäten werden nicht vom Parser aufgelöst (Schutz vor Entity-Expansion),
  // sondern gezielt in `text()` mit `he` dekodiert.
  processEntities: false,
  htmlEntities: false,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  maxNestedTags: 100,
  isArray: (name) => name === "item" || name === "entry" || name === "link" || name === "category",
});

type Node = unknown;

function isRecord(value: Node): value is Record<string, Node> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Liest den Textinhalt eines Knotens, egal ob String, Zahl oder Objekt mit #text.
 * Mit `decode` werden XML-Entitäten aufgelöst (für URLs, Daten, IDs). Titel und
 * Inhalte bleiben roh, weil `htmlToText` sie in der richtigen Reihenfolge
 * (erst Tags entfernen, dann dekodieren) verarbeitet.
 */
function text(value: Node, decode = true): string | null {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) return text(value[0], decode);
  if (typeof value === "string") return (decode ? decodeEntities(value) : value).trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (isRecord(value)) return text(value["#text"], decode);
  return null;
}

function raw(value: Node): string | null {
  return text(value, false);
}

function attr(value: Node, name: string): string | null {
  if (!isRecord(value)) return null;
  const raw = value[`@_${name}`];
  return typeof raw === "string" ? decodeEntities(raw).trim() || null : null;
}

function first(...values: (string | null)[]): string | null {
  for (const value of values) if (value) return value;
  return null;
}

function asArray(value: Node): Node[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function parseRss2Item(item: Record<string, Node>): FeedEntry {
  const links = asArray(item.link);
  const guid = text(item.guid);
  const guidIsLink = isRecord(asArray(item.guid)[0]) ? attr(asArray(item.guid)[0], "isPermaLink") !== "false" : true;
  const link = first(
    ...links.map((l) => text(l)),
    guid && guidIsLink && /^https?:\/\//i.test(guid) ? guid : null,
  );
  return {
    title: raw(item.title) ?? "",
    link,
    guid,
    published: first(text(item.pubDate), text(item["dc:date"])),
    body: first(raw(item["content:encoded"]), raw(item.description)),
  };
}

function atomLink(entry: Record<string, Node>): string | null {
  const links = asArray(entry.link);
  const alternate = links.find((l) => {
    const rel = attr(l, "rel");
    return rel === null || rel === "alternate";
  });
  return attr(alternate ?? links[0], "href");
}

function parseAtomEntry(entry: Record<string, Node>): FeedEntry {
  return {
    title: raw(entry.title) ?? "",
    link: atomLink(entry),
    guid: text(entry.id),
    published: first(text(entry.published), text(entry.updated)),
    body: first(raw(entry.content), raw(entry.summary)),
  };
}

function parseRss1Item(item: Record<string, Node>): FeedEntry {
  return {
    title: raw(item.title) ?? "",
    link: first(text(item.link), attr(item, "rdf:about")),
    guid: attr(item, "rdf:about"),
    published: text(item["dc:date"]),
    body: first(raw(item["content:encoded"]), raw(item.description)),
  };
}

function records(values: Node): Record<string, Node>[] {
  return asArray(values).filter(isRecord);
}

/**
 * Erkennt RSS 2.0, Atom und RSS 1.0 (RDF) und liefert eine einheitliche
 * Eintragsliste. Reine Funktion ohne Netzwerkzugriff.
 */
export function parseFeed(xml: string): ParsedFeed {
  const trimmed = xml.trimStart();
  if (!trimmed.startsWith("<")) throw new FeedParseError("Antwort ist kein XML.");
  if (/<!ENTITY/i.test(trimmed.slice(0, 5000))) {
    throw new FeedParseError("Feed enthält eigene Entitätsdefinitionen und wird aus Sicherheitsgründen nicht verarbeitet.");
  }

  let doc: Record<string, Node>;
  try {
    doc = parser.parse(trimmed) as Record<string, Node>;
  } catch (error) {
    throw new FeedParseError(`XML nicht lesbar: ${(error as Error).message}`);
  }

  const rss = doc.rss;
  if (isRecord(rss)) {
    const channel = asArray(rss.channel)[0];
    if (!isRecord(channel)) throw new FeedParseError("RSS ohne <channel>.");
    return { format: "rss2", title: text(channel.title), entries: records(channel.item).map(parseRss2Item) };
  }

  const feed = doc.feed;
  if (isRecord(feed)) {
    return { format: "atom", title: text(feed.title), entries: records(feed.entry).map(parseAtomEntry) };
  }

  const rdf = doc["rdf:RDF"];
  if (isRecord(rdf)) {
    const channel = asArray(rdf.channel)[0];
    return {
      format: "rss1",
      title: isRecord(channel) ? text(channel.title) : null,
      entries: records(rdf.item).map(parseRss1Item),
    };
  }

  throw new FeedParseError("Unbekanntes Feed-Format (weder RSS noch Atom).");
}
