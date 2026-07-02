import 'server-only';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { getAllSlugs } from '../loader';
import { treeDefinitionSchema, type TreeDefinition } from './schema';
import { validateTree } from './validator';
import { buildLayout } from './layout';
import type { TreeLayout } from './types';

/**
 * Build-time loader for the bundled lesson-tree definition. Runs entirely at
 * prerender (mirrors `lib/lessons/loader.ts`) so the tree structure ships as
 * static data and nothing re-parses in the Cloudflare Worker.
 *
 * Fail-safe (spec FR-004): a missing/malformed asset or any validator
 * violation yields `null`, and the page renders a friendly error view rather
 * than crashing. The drift-guard test is the pre-release check that this never
 * happens for the real asset.
 */

const TREE_FILE = path.join(process.cwd(), 'content', 'lessons', 'tree.json');

/**
 * Parse + shape-validate `tree.json`. Throws on a malformed asset — used by the
 * drift-guard test (which WANTS the throw to surface a broken asset). Render
 * paths should use {@link getTreeLayout}, which never throws.
 */
export function loadTreeDefinition(): TreeDefinition {
  const raw: unknown = JSON.parse(readFileSync(TREE_FILE, 'utf8'));
  return treeDefinitionSchema.parse(raw);
}

let layoutCache: TreeLayout | null | undefined;

/**
 * The fail-safe render entry point: parsed → semantically validated → laid out.
 * Returns `null` (and logs) if the asset is missing/malformed or the definition
 * is invalid against the catalog, so callers never crash.
 */
export function getTreeLayout(): TreeLayout | null {
  if (layoutCache !== undefined) return layoutCache;

  try {
    const definition = loadTreeDefinition();
    const violations = validateTree(definition, getAllSlugs());
    if (violations.length > 0) {
      console.error(
        `[lesson-tree] invalid tree.json — ${violations.length} violation(s):`,
        violations.map((v) => `${v.code}:${v.ref}`).join(', '),
      );
      layoutCache = null;
      return null;
    }
    layoutCache = buildLayout(definition);
  } catch (error) {
    console.error('[lesson-tree] failed to load tree.json:', error);
    layoutCache = null;
  }
  return layoutCache;
}
