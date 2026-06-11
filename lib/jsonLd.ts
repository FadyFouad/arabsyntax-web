// Serialize a value for embedding in an inline <script type="application/ld+json">.
// JSON.stringify does NOT escape "<", so a "</script>" (or "<!--") sequence inside
// any string would break out of the script element. Escaping "<" closes that hole
// while keeping the output valid JSON. Defensive: today's data is repo-authored,
// but this stays safe if user-supplied content ever reaches a JSON-LD block.
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
