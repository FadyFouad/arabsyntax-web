import type { TreeNodeDefinition } from './schema';

/**
 * Derived model shared between the build-time loader/layout (server) and the
 * client tree view. Node STATE is intentionally NOT part of the static model —
 * it is computed on the client from local progress (see `deriveNodeState`), so
 * the prerendered structure stays user-agnostic and cache-safe.
 */

/**
 * The four node states (mirrors the mobile `NodeState`).
 * `needsReview` is modeled and has a defined visual treatment, but no rule in
 * this release ever produces it — groundwork for future spaced repetition.
 */
export type NodeState = 'locked' | 'available' | 'completed' | 'needsReview';

/** Grid slot of a node inside its tier band (row/col are layout units). */
export interface NodePosition {
  /** Visual row (a tier may wrap into several rows); 0-based, top → bottom. */
  row: number;
  /**
   * Horizontal slot, possibly FRACTIONAL: nodes centre under the mean column
   * of their prerequisites (barycentric). ≥ 0, leftmost node at 0; neighbours
   * in a row are ≥ 1 slot apart. In RTL, col 0 renders right-most.
   */
  col: number;
}

/** A node resolved with its catalog title, tier, and grid position (static). */
export interface LayoutNode {
  id: string;
  lessonId: string;
  /** Short Arabic label from tree.json (may be shorter than the lesson title). */
  title: string;
  prerequisites: string[];
  /** Longest-path depth from an entry point (roots = 0). */
  tier: number;
  position: NodePosition;
}

/** A prerequisite edge, `from` (prerequisite) → `to` (dependent). */
export interface TreeEdge {
  from: string;
  to: string;
}

/** The full static layout the loader hands to the client tree view. */
export interface TreeLayout {
  nodes: LayoutNode[];
  edges: TreeEdge[];
  /** Total grid rows across all tier bands. */
  rows: number;
  /** Canvas width in grid units (max col + 1; fractional cols allowed). */
  columns: number;
}

export type { TreeNodeDefinition };
