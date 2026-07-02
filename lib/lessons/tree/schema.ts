import { z } from 'zod';

/**
 * Shape contract for `content/lessons/tree.json` — the bundled, versioned
 * curriculum map (mirrors the mobile spec's tree.schema.json).
 *
 * This validates SHAPE only. Graph semantics (acyclicity, reachability,
 * catalog coverage, dangling/duplicate refs) are a separate concern and live
 * in `validator.ts` — a JSON schema cannot express them.
 *
 * `id` equals `lessonId` in v1; they are kept as separate fields so a future
 * schema can add non-lesson nodes (checkpoints, review nodes) without a break.
 */

// Node ids and lesson slugs share the same charset as lesson filenames
// (lowercase, digits, '_', '-'). No '.' or '/' so an id can never traverse.
const NODE_ID = /^[a-z0-9_-]+$/;

export const treeNodeDefinitionSchema = z.object({
  id: z.string().regex(NODE_ID),
  lessonId: z.string().regex(NODE_ID),
  title: z.string().min(1),
  prerequisites: z.array(z.string().regex(NODE_ID)),
});

export const treeDefinitionSchema = z.object({
  schemaVersion: z.literal(1),
  nodes: z.array(treeNodeDefinitionSchema).min(1),
});

export type TreeNodeDefinition = z.infer<typeof treeNodeDefinitionSchema>;
export type TreeDefinition = z.infer<typeof treeDefinitionSchema>;