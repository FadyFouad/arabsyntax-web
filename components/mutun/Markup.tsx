import { Fragment } from 'react';
import { parseMarkup, type MarkupNode, type MarkupTag } from '@/lib/mutun/markup';

// Styled spans for each inline tag, built from the shared design tokens. Raw
// `[[…]]` markers can never reach here — parseMarkup strips them structurally.
const TAG_CLASS: Record<MarkupTag, string> = {
  term: 'font-semibold text-primary',
  rule: 'font-semibold text-accent-teal',
  ex: 'text-accent-gold',
  mark: 'rounded bg-hl-amber-bg px-1 text-hl-amber-text',
};

function renderNodes(nodes: MarkupNode[]): React.ReactNode {
  return nodes.map((node, i) => {
    if (node.type === 'text') return <Fragment key={i}>{node.value}</Fragment>;
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
