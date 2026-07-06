/**
 * Tolerant parser for `public/quiz/manifest.json`. The whole point of loading
 * files "via the manifest rather than hardcoding filenames" is that a fresh
 * export can be dropped in without a code change — so this accepts every
 * reasonable manifest shape the app might emit:
 *
 *   ["primary.json", "midOne.json", …]                       // bare list
 *   { "files": ["primary.json", …] }                          // wrapped list
 *   { "files": [{ "file": "primary.json", "stage": "primary" }] } // with stage
 *
 * The stage KEY for each file is taken from an explicit `stage` field when
 * present, else derived from the filename stem (which matches the app's stage
 * values: `primary.json` → `primary`). `unstaged.json` maps to {@link UNSTAGED_KEY}.
 */

export interface ManifestEntry {
  /** Filename relative to /quiz/, e.g. `primary.json`. */
  file: string;
  /** Stage key used to look this file up (a Stage value or `unstaged`). */
  stage: string;
}

/** `primary.json` → `primary`; `unstaged.json` → `unstaged`. */
export function stageKeyFromFilename(file: string): string {
  return file.replace(/^.*\//, '').replace(/\.json$/i, '');
}

function toEntry(item: unknown): ManifestEntry | null {
  if (typeof item === 'string') {
    return item ? { file: item, stage: stageKeyFromFilename(item) } : null;
  }
  if (item && typeof item === 'object') {
    const obj = item as Record<string, unknown>;
    const file = obj.file ?? obj.filename ?? obj.name ?? obj.path;
    if (typeof file !== 'string' || !file) return null;
    const stage = typeof obj.stage === 'string' && obj.stage ? obj.stage : stageKeyFromFilename(file);
    return { file, stage };
  }
  return null;
}

export function parseManifest(raw: unknown): ManifestEntry[] {
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { files?: unknown[] }).files)
      ? (raw as { files: unknown[] }).files
      : [];

  const seen = new Set<string>();
  const entries: ManifestEntry[] = [];
  for (const item of list) {
    const entry = toEntry(item);
    if (entry && !seen.has(entry.stage)) {
      seen.add(entry.stage);
      entries.push(entry);
    }
  }
  return entries;
}
