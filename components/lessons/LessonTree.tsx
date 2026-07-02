'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useTranslations } from 'next-intl';
import { Check, Lock, Maximize2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import type { LayoutNode, NodeState, TreeLayout } from '@/lib/lessons/tree/types';
import { deriveNodeState } from '@/lib/lessons/progress/state';
import { useCompletedLessons } from './useLessonProgress';
import NodeSheet from './NodeSheet';

/**
 * Interactive lesson-tree canvas (US1/US2 + polish). Renders the static,
 * build-time layout as an absolutely-positioned grid over an SVG edge layer,
 * coloured per derived state (locked / available / completed) from the local
 * progress store. Tapping a node opens the {@link NodeSheet}.
 *
 * Polish pass:
 *  - Path highlighting: hovering/focusing a node lights its prerequisite path
 *    (all transitive prerequisites) and subdues unrelated edges + nodes.
 *  - Zoom is focal-anchored — buttons zoom about the viewport centre, ⌘/Ctrl +
 *    wheel (and trackpad pinch) about the cursor — so content doesn't drift.
 *  - Fit-to-view scales the whole tree into the (bounded-height) viewport.
 *  - Mouse drag pans; touch keeps native scroll/pinch.
 *
 * Geometry is a pure function of `layout`; zoom is a CSS transform wrapped in a
 * sizing div so scrollbars track the scaled footprint. RTL mirrors columns so
 * col 0 sits right-most.
 */

const NODE_W = 168;
const NODE_H = 56;
const COL_GAP = 32;
const ROW_GAP = 56;
const PAD = 24;

const STEP_X = NODE_W + COL_GAP;
const STEP_Y = NODE_H + ROW_GAP;

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 1.6;
const ZOOM_STEP = 0.2;
const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));

const NODE_CLASS: Record<NodeState, string> = {
  completed: 'border-success bg-surface-elevated text-success hover:border-success',
  available: 'border-border bg-surface-elevated text-text hover:border-primary hover:text-primary',
  locked: 'border-border bg-surface text-text-muted hover:opacity-100',
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
  const [zoom, setZoom] = useState(1);
  const [activeId, setActiveId] = useState<string | null>(null);
  const zoomPercent = Math.round(zoom * 100);

  // Mirror of `zoom` for the stable (deps-free) zoom callbacks + wheel listener,
  // which need the latest value without re-subscribing on every change.
  const zoomRef = useRef(1);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const titleById = useMemo(() => new Map(layout.nodes.map((n) => [n.id, n.title])), [layout]);
  const prereqsById = useMemo(
    () => new Map(layout.nodes.map((n) => [n.id, n.prerequisites])),
    [layout],
  );

  // The active node plus all of its transitive prerequisites — the path we light
  // up. `null` when nothing is hovered/focused (everything renders normally).
  const activePath = useMemo(() => {
    if (!activeId) return null;
    const set = new Set<string>();
    const stack = [activeId];
    while (stack.length) {
      const id = stack.pop()!;
      if (set.has(id)) continue;
      set.add(id);
      for (const p of prereqsById.get(id) ?? []) stack.push(p);
    }
    return set;
  }, [activeId, prereqsById]);

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
      return [
        {
          key: `${edge.from}-${edge.to}`,
          from: edge.from,
          to: edge.to,
          d: `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`,
        },
      ];
    });

    return { width, height, placed, paths };
  }, [layout, rtl]);

  // ── Zoom (focal-anchored) ─────────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingFocal = useRef<{ cx: number; cy: number; vx: number; vy: number } | null>(null);

  // After a zoom re-render, restore the focal point to the same viewport spot.
  useLayoutEffect(() => {
    const p = pendingFocal.current;
    if (!p) return;
    pendingFocal.current = null;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = p.cx * zoom - p.vx;
    el.scrollTop = p.cy * zoom - p.vy;
  }, [zoom]);

  const zoomAbout = useCallback((next: number, clientX?: number, clientY?: number) => {
    const target = clampZoom(next);
    const el = scrollRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const vx = clientX != null ? clientX - rect.left : el.clientWidth / 2;
      const vy = clientY != null ? clientY - rect.top : el.clientHeight / 2;
      pendingFocal.current = {
        cx: (el.scrollLeft + vx) / zoomRef.current,
        cy: (el.scrollTop + vy) / zoomRef.current,
        vx,
        vy,
      };
    }
    setZoom(target);
  }, []);

  const fitView = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scale = clampZoom(Math.min(el.clientWidth / width, el.clientHeight / height));
    pendingFocal.current = { cx: width / 2, cy: height / 2, vx: el.clientWidth / 2, vy: el.clientHeight / 2 };
    setZoom(scale);
  }, [width, height]);

  const zoomIn = useCallback(() => zoomAbout(zoomRef.current + ZOOM_STEP), [zoomAbout]);
  const zoomOut = useCallback(() => zoomAbout(zoomRef.current - ZOOM_STEP), [zoomAbout]);
  const zoomReset = useCallback(() => zoomAbout(1), [zoomAbout]);

  // ⌘/Ctrl + wheel (and trackpad pinch, which reports ctrlKey) zooms about the
  // cursor. Native non-passive listener so we can preventDefault the browser's
  // page-zoom. Plain wheel is left alone for normal scrolling.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      zoomAbout(zoomRef.current + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP), event.clientX, event.clientY);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAbout]);

  // ── Mouse drag-to-pan (touch keeps native scroll/pinch) ───────────────────
  const drag = useRef({ active: false, startX: 0, startY: 0, left: 0, top: 0 });

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    if ((event.target as HTMLElement).closest('button, a')) return;
    const el = scrollRef.current;
    if (!el) return;
    drag.current = { active: true, startX: event.clientX, startY: event.clientY, left: el.scrollLeft, top: el.scrollTop };
    el.setPointerCapture(event.pointerId);
  }, []);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = drag.current.left - (event.clientX - drag.current.startX);
    el.scrollTop = drag.current.top - (event.clientY - drag.current.startY);
  }, []);

  const endDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    drag.current.active = false;
    scrollRef.current?.releasePointerCapture?.(event.pointerId);
  }, []);

  const btn =
    'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-text-muted transition-colors hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-text-muted';

  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <button type="button" aria-label={t('zoomOut')} onClick={zoomOut} disabled={zoom <= ZOOM_MIN} className={btn}>
          <ZoomOut className="h-4 w-4" aria-hidden="true" />
        </button>
        <span
          className="min-w-14 text-center text-sm font-medium tabular-nums text-text-secondary"
          aria-label={t('zoomLevel', { percent: zoomPercent })}
        >
          {zoomPercent}%
        </span>
        <button type="button" aria-label={t('zoomIn')} onClick={zoomIn} disabled={zoom >= ZOOM_MAX} className={btn}>
          <ZoomIn className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" aria-label={t('zoomFit')} onClick={fitView} className={btn}>
          <Maximize2 className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" aria-label={t('zoomReset')} onClick={zoomReset} disabled={zoom === 1} className={btn}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div
        ref={scrollRef}
        role="group"
        aria-label={t('treeRegionLabel')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="h-[70vh] min-h-96 cursor-grab select-none overflow-auto overscroll-contain rounded-2xl border border-border bg-surface active:cursor-grabbing"
      >
        {/* Sizing wrapper: reserves the SCALED footprint so the scrollbars track
            the zoomed canvas (transform alone doesn't change layout size). */}
        <div className="mx-auto" style={{ width: width * zoom, height: height * zoom }}>
          <div
            className="relative"
            style={{ width, height, transform: `scale(${zoom})`, transformOrigin: '0 0' }}
          >
            <svg
              className="pointer-events-none absolute inset-0"
              width={width}
              height={height}
              aria-hidden="true"
            >
              {paths.map((p) => {
                const lit = activePath ? activePath.has(p.from) && activePath.has(p.to) : null;
                const strokeClass =
                  lit === null ? 'text-border' : lit ? 'text-primary' : 'text-border opacity-20';
                return (
                  <path
                    key={p.key}
                    className={`transition ${strokeClass}`}
                    d={p.d}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={lit ? 2.5 : 2}
                  />
                );
              })}
            </svg>

            {placed.map(({ node, x, y }) => {
              const state = deriveNodeState(node, completed);
              const dim = activePath ? !activePath.has(node.id) : false;
              return (
                <button
                  key={node.id}
                  type="button"
                  aria-label={t('treeNodeAria', { title: node.title })}
                  onClick={() => setSelected(node)}
                  onMouseEnter={() => setActiveId(node.id)}
                  onMouseLeave={() => setActiveId((cur) => (cur === node.id ? null : cur))}
                  onFocus={() => setActiveId(node.id)}
                  onBlur={() => setActiveId((cur) => (cur === node.id ? null : cur))}
                  className={`absolute flex items-center justify-center gap-1.5 rounded-xl border px-3 text-center text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary ${NODE_CLASS[state]}`}
                  style={{ left: x, top: y, width: NODE_W, height: NODE_H, opacity: dim ? 0.3 : undefined }}
                >
                  {state === 'completed' && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                  {state === 'locked' && <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                  <span className="line-clamp-2">{node.title}</span>
                </button>
              );
            })}
          </div>
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
