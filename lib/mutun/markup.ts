/**
 * Inline markup for matn `text`: `[[term:…]]`, `[[ex:…]]`, `[[mark:…]]`,
 * `[[rule:…]]`, nestable. This module is the single source of truth for both:
 *   - parseMarkup()  → a node tree the React renderer turns into styled spans
 *   - stripMarkup()  → the plain-text projection used by content tests
 *
 * Guarantee: parseMarkup never emits a raw `[[` or `]]` in a text node, so the
 * markers can never reach the screen — any stray/unknown bracket pair is dropped
 * defensively rather than rendered.
 */

export const MARKUP_TAGS = ['term', 'ex', 'mark', 'rule'] as const;
export type MarkupTag = (typeof MARKUP_TAGS)[number];

export type MarkupNode =
  | { type: 'text'; value: string }
  | { type: 'tag'; tag: MarkupTag; children: MarkupNode[] };

/** If an opener `[[<tag>:` starts at index i, return the tag; else null. */
function openerAt(s: string, i: number): MarkupTag | null {
  for (const tag of MARKUP_TAGS) {
    if (s.startsWith(`[[${tag}:`, i)) return tag;
  }
  return null;
}

/**
 * Parse inline markup into a node tree. Nesting is supported; a `]]` closes the
 * nearest open tag. Unclosed tags at end-of-string close implicitly. Stray `[[`
 * (not a known opener) and stray `]]` (no open tag) are dropped, never rendered.
 */
export function parseMarkup(input: string): MarkupNode[] {
  const root: MarkupNode[] = [];
  const childStack: MarkupNode[][] = [root];
  let depth = 0;
  let buf = '';
  let i = 0;

  const top = () => childStack[childStack.length - 1];
  const flush = () => {
    if (buf) {
      top().push({ type: 'text', value: buf });
      buf = '';
    }
  };

  while (i < input.length) {
    const tag = openerAt(input, i);
    if (tag) {
      flush();
      const node: MarkupNode = { type: 'tag', tag, children: [] };
      top().push(node);
      childStack.push(node.children);
      depth++;
      i += tag.length + 3; // '[[' + tag + ':'
      continue;
    }
    if (input.startsWith(']]', i)) {
      if (depth > 0) {
        flush();
        childStack.pop();
        depth--;
      }
      // stray ']]' with nothing open → dropped
      i += 2;
      continue;
    }
    if (input.startsWith('[[', i)) {
      // unknown/stray '[[' → dropped so the raw marker never leaks
      i += 2;
      continue;
    }
    buf += input[i];
    i++;
  }
  flush();
  return root;
}

/**
 * Plain-text projection: remove `[[<tag>:` openers and `]]` closers, keeping the
 * inner text. This is the exact recipe content tests use before asserting on
 * matn prose.
 */
export function stripMarkup(text: string): string {
  return text.replace(/\[\[[a-z]+:/g, '').replace(/\]\]/g, '');
}

/** Remove Arabic tashkeel (harakat), dagger alif, and tatweel. */
export function stripTashkeel(text: string): string {
  return text.replace(/[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭـ]/g, '');
}

/** Markup-stripped, tashkeel-stripped, whitespace-collapsed — for text comparison. */
export function normalizeForCompare(text: string): string {
  return stripTashkeel(stripMarkup(text)).replace(/\s+/g, ' ').trim();
}
