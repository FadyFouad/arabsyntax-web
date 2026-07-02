'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import type { TreeLayout } from '@/lib/lessons/tree/types';

/**
 * Read-only lesson-tree canvas (US1). Renders the static, build-time layout as
 * an absolutely-positioned grid of lesson links with an SVG edge layer behind
 * them. Node STATE (locked/completed) is intentionally absent here — that lands
 * in Phase 3 once local progress exists; every node is a plain link for now.
 *
 * Geometry is a pure function of `layout`, so the SVG dimensions are known up
 * front and the whole thing lives inside a natively-scrollable container (no
 * pan/zoom dependency). RTL mirrors columns so col 0 sits right-most, matching
 * the JSON authoring order under the Arabic reading direction.
 */

const NODE_W = 168;
const NODE_H = 56;
const COL_GAP = 32;
const ROW_GAP = 56;
const PAD = 24;

const STEP_X = NODE_W + COL_GAP;
const STEP_Y = NODE_H + ROW_GAP;

interface LessonTreeProps {
  layout: TreeLayout;
  rtl: boolean;
}

export default function LessonTree({ layout, rtl }: LessonTreeProps) {
  const t = useTranslations('lessons');

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

        {placed.map(({ node, x, y }) => (
          <Link
            key={node.id}
            href={`/lessons/${node.lessonId}`}
            aria-label={t('treeNodeAria', { title: node.title })}
            className="absolute flex items-center justify-center rounded-xl border border-border bg-surface-elevated px-3 text-center text-sm font-semibold text-text transition-colors hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            style={{ left: x, top: y, width: NODE_W, height: NODE_H }}
          >
            {node.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
