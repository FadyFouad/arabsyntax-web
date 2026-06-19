import 'server-only';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  MATN_ID_PATTERN,
  manifestSchema,
  matnContentSchema,
  type ManifestEntry,
  type MatnContent,
} from './schema';

const DEFAULT_DIR = path.join(process.cwd(), 'content', 'mutun');

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8'));
}

// Memoize per directory. The default dir is read once at build/request time;
// tests pass a fixture dir, which gets its own cache entry.
const manifestCache = new Map<string, ManifestEntry[]>();
const matnCache = new Map<string, MatnContent | null>();

/**
 * The manifest list, in file order.
 *
 * THROWS if the manifest is missing or malformed — the index page catches this
 * and shows the distinct ERROR state. An empty-but-valid manifest returns `[]`,
 * which the page renders as the EMPTY state ("لا توجد متون متاحة بعد"). The two
 * are deliberately separable so a real failure never masquerades as "no content".
 */
export function getMutunIndex(dir: string = DEFAULT_DIR): ManifestEntry[] {
  const cached = manifestCache.get(dir);
  if (cached) return cached;
  const parsed = manifestSchema.parse(readJson(path.join(dir, 'manifest.json')));
  manifestCache.set(dir, parsed.mutun);
  return parsed.mutun;
}

/** Manifest ids — drives generateStaticParams. Same throw/empty semantics. */
export function getMatnIds(dir: string = DEFAULT_DIR): string[] {
  return getMutunIndex(dir).map((m) => m.id);
}

/**
 * Load one matn's content file. Returns `null` for an unsafe id, a missing file,
 * or a malformed file — the reader page treats any null as a 404 (notFound),
 * never as fabricated content.
 */
export function getMatn(id: string, dir: string = DEFAULT_DIR): MatnContent | null {
  if (!MATN_ID_PATTERN.test(id)) return null;
  const key = `${dir}::${id}`;
  if (matnCache.has(key)) return matnCache.get(key)!;

  let result: MatnContent | null = null;
  try {
    result = matnContentSchema.parse(readJson(path.join(dir, `${id}.json`)));
  } catch {
    result = null;
  }
  matnCache.set(key, result);
  return result;
}
