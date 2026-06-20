import { Fragment } from 'react';
import { parseMarkup, type MarkupNode, type MarkupTag } from '@/lib/mutun/markup';
import { splitSymbolSpans, type SymbolKind } from '@/lib/mutun/symbols';

// Styled spans for each inline tag, built from the shared design tokens. Raw
// `[[…]]` markers can never reach here — parseMarkup strips them structurally.
const TAG_CLASS: Record<MarkupTag, string> = {
  term: 'font-semibold text-primary',
  rule: 'font-semibold text-accent-teal',
  ex: 'text-accent-gold',
  mark: 'rounded bg-hl-amber-bg px-1 text-hl-amber-text',
};

// Symbol-keyed spans (no `[[…]]` needed): Quran ﴿…﴾ gets the green Quran-quote
// chip; an example «…» reuses the same gold as the `ex` tag, so symbol-marked and
// tag-marked content style identically. Honoring brackets stay inside the span.
const SYMBOL_CLASS: Record<SymbolKind, string> = {
  quran: 'rounded bg-quote-quran-bg px-0.5 text-quote-quran-text',
  example: 'text-accent-gold',
};

// A text node may still contain ﴿…﴾ / «…» literals — style those inline.
function renderText(value: string, keyPrefix: number): React.ReactNode {
  return splitSymbolSpans(value).map((seg, i) => {
    const key = `${keyPrefix}.${i}`;
    if (seg.type === 'text') return <Fragment key={key}>{seg.value}</Fragment>;
    return (
      <span key={key} className={SYMBOL_CLASS[seg.kind]}>
        {seg.value}
      </span>
    );
  });
}

function renderNodes(nodes: MarkupNode[]): React.ReactNode {
  return nodes.map((node, i) => {
    if (node.type === 'text') return <Fragment key={i}>{renderText(node.value, i)}</Fragment>;
    return (
      <span key={i} className={TAG_CLASS[node.tag]}>
        {renderNodes(node.children)}
      </span>
    );
  });
}

/** Render matn `text` with inline markup resolved to styled spans. */
export function Markup({ text }: { text: string }) {
  return <>{renderNodes(parseMarkup(text))}</>;
}
