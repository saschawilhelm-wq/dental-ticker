/**
 * Ermittelt die Zeichenkodierung eines Feeds und dekodiert ihn.
 * Viele Behörden-Feeds sind noch ISO-8859-1 kodiert; `Response.text()` würde
 * Umlaute dann zerstören.
 *
 * Reihenfolge: Byte-Order-Mark → Content-Type-Header → XML-Deklaration → UTF-8.
 */
export function detectCharset(bytes: Uint8Array, contentType: string | null): string {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return "utf-8";
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return "utf-16le";
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return "utf-16be";

  const fromHeader = contentType?.match(/charset\s*=\s*"?([\w.:-]+)"?/i)?.[1];
  if (fromHeader && isSupported(fromHeader)) return fromHeader.toLowerCase();

  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 200));
  const fromDeclaration = head.match(/<\?xml[^>]*encoding\s*=\s*["']([\w.:-]+)["']/i)?.[1];
  if (fromDeclaration && isSupported(fromDeclaration)) return fromDeclaration.toLowerCase();

  return "utf-8";
}

function isSupported(label: string): boolean {
  try {
    new TextDecoder(label);
    return true;
  } catch {
    return false;
  }
}

export function decodeFeed(bytes: Uint8Array, contentType: string | null): string {
  return new TextDecoder(detectCharset(bytes, contentType)).decode(bytes);
}
