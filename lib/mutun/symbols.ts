/**
 * Symbol-keyed inline styling for matn `text`.
 *
 * Some matns (e.g. قطر الندى) are untagged prose, yet the source already marks
 * two content kinds by literal symbol, which we honor at render time WITHOUT
 * requiring `[[…]]` markup:
 *   - Quran   : wrapped in ﴿ … ﴾ (U+FD3F … U+FD3E, ornate parentheses)
 *   - example : wrapped in « … » (U+00AB … U+00BB, guillemets)
 *
 * splitSymbolSpans() slices a plain string into ordered segments so the renderer
 * can wrap each ﴿…﴾ / «…» run in a styled span. The honoring brackets are kept
 * inside the span (part of the marking), never stripped. term/rule still require
 * `[[…]]` tags — they are intentionally NOT inferred from symbols.
 */

export type SymbolKind = 'quran' | 'example';

export type SymbolSegment =
  | { type: 'text'; value: string }
  | { type: 'symbol'; kind: SymbolKind; value: string };

// A Quran run (﴿…﴾) or an example run («…»). Non-greedy via a negated class so a
// run never swallows a following run; an unclosed opener simply never matches and
// stays plain text.
const SYMBOL_RE = /﴿[^﴾]*﴾|«[^»]*»/g;

/** Split `text` into plain-text and symbol-wrapped segments, in source order. */
export function splitSymbolSpans(text: string): SymbolSegment[] {
  const out: SymbolSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(SYMBOL_RE)) {
    const start = match.index;
    if (start > last) out.push({ type: 'text', value: text.slice(last, start) });
    const value = match[0];
    out.push({ type: 'symbol', kind: value[0] === '﴿' ? 'quran' : 'example', value });
    last = start + value.length;
  }
  if (last < text.length) out.push({ type: 'text', value: text.slice(last) });
  return out;
}
