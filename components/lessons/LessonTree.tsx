'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Lock } from 'lucide-react';
import type { LayoutNode, NodeState, TreeLayout } from '@/lib/lessons/tree/types';
import { deriveNodeState } from '@/lib/lessons/progress/state';
import { useCompletedLessons } from './useLessonProgress';
import NodeSheet from './NodeSheet';

/**
 * Interactive lesson-tree canvas (US1/US2). Renders the static, build-time
 * layout as an absolutely-positioned grid over an SVG edge layer, and colours
 * each node by its derived state (locked / available / completed) from the local
 * progress store. Tapping a node opens the {@link NodeSheet} with its actions.
 *
 * Geometry is a pure function of `layout`, so the SVG dimensions are known up
 * front and the whole thing lives inside a natively-scrollable container. RTL
 * mirrors columns so col 0 sits right-most, matching JSON authoring order under
 * the Arabic reading direction.
 */

const NODE_W = 168;
const NODE_H = 56;
const COL_GAP = 32;
const ROW_GAP = 56;
const PAD = 24;

const STEP_X = NODE_W + COL_GAP;
const STEP_Y = NODE_H + ROW_GAP;

const NODE_CLASS: Record<NodeState, string> = {
  completed: 'border-success bg-surface-elevated text-success hover:border-success',
  available: 'border-border bg-surface-elevated text-text hover:border-primary hover:text-primary',
  locked: 'border-border bg-surface text-text-muted opacity-70 hover:opacity-100',
  needsReview: 'border-warning bg-surface-elevated text-warning hover:border-warning',
};

interface LessonTreeProps {
  layout: TreeLayout;
  rtl: boolean;
}

export default function LessonTree({ layout, rtl }: LessonTreeProps) {
  const t = useTranslations('lessons');
  const completed = useCompletedLessons();
  const [selected, setSelected] = useState<LayoutNode | null>(null);

  const titleById = useMemo(
    () => new Map(layout.nodes.map((n) => [n.id, n.title])),
    [layout],
  );

  const { width, height, placed, paths } = useMemo(() => {
    const columns = Math.max(1, layout.columns);
    const width = PAD * 2 + (columns - 1) * STEP_X + NODE_W;
    const height = PAD * 2 + Math.max(0, layout.rows - 1) * STEP_Y + NODE_H;

    const xOf = (col: number) => PAD + (rtl ? columns - 1 - col : col) * STEP_X;
    const yOf = (row: number) => PAD + row * STEP_Y;

    const placed = layout.nodes.map((node) => ({
      node,
      x: xOf(node.position.col),
      y: yOf(node.position.row),
    }));

    const centers = new Map(placed.map((p) => [p.node.id, p]));
    const paths = layout.edges.flatMap((edge) => {
      const from = centers.get(edge.from);
      const to = centers.get(edge.to);
      if (!from || !to) return [];
      const x1 = from.x + NODE_W / 2;
      const y1 = from.y + NODE_H;
      const x2 = to.x + NODE_W / 2;
      const y2 = to.y;
      const midY = y1 + (y2 - y1) / 2;
      return [{ key: `${edge.from}-${edge.to}`, d: `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}` }];
    });

    return { width, height, placed, paths };
  }, [layout, rtl]);

  return (
    <>
      <div
        role="group"
        aria-label={t('treeRegionLabel')}
        className="overflow-auto rounded-2xl border border-border bg-surface p-2"
      >
        <div className="relative mx-auto" style={{ width, height }}>
          <svg
            className="pointer-events-none absolute inset-0 text-border"
            width={width}
            height={height}
            aria-hidden="true"
          >
            {paths.map((p) => (
              <path key={p.key} d={p.d} fill="none" stroke="currentColor" strokeWidth={2} />
            ))}
          </svg>

          {placed.map(({ node, x, y }) => {
            const state = deriveNodeState(node, completed);
            return (
              <button
                key={node.id}
                type="button"
                aria-label={t('treeNodeAria', { title: node.title })}
                onClick={() => setSelected(node)}
                className={`absolute flex items-center justify-center gap-1.5 rounded-xl border px-3 text-center text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${NODE_CLASS[state]}`}
                style={{ left: x, top: y, width: NODE_W, height: NODE_H }}
              >
                {state === 'completed' && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                {state === 'locked' && <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                <span className="line-clamp-2">{node.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <NodeSheet
          node={selected}
          state={deriveNodeState(selected, completed)}
          titleById={titleById}
          completed={completed}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
