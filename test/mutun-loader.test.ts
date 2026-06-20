import { describe, it, expect, vi } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// loader.ts opens with `import 'server-only'`, which throws outside a React
// Server Component. Neutralize it so the loader can be unit-tested in node.
vi.mock('server-only', () => ({}));

const { getMutunIndex, getMatnIds, getMatn } = await import('@/lib/mutun/loader');

/** Make a throwaway content dir with the given files; returns its path. */
function fixtureDir(files: Record<string, string>): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'mutun-'));
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(path.join(dir, name), content);
  }
  return dir;
}

describe('getMatn slug guard (path-traversal defense)', () => {
  it.each(['../../etc/passwd', 'a/b', 'a\\b', 'manifest.json', 'Foo', 'a b', ''])(
    'rejects unsafe id %j',
    (id) => expect(getMatn(id)).toBeNull(),
  );
});

describe('getMutunIndex / getMatnIds / getMatn against the real assets', () => {
  it('lists the shipped matns in manifest order', () => {
    const ids = getMatnIds();
    expect(ids).toEqual(['aljurrumiyya', 'alimriti', 'qatr_alnada']);
  });

  it('returns the same cached array on a second call', () => {
    expect(getMutunIndex()).toBe(getMutunIndex());
  });

  it('loads a real matn with its units', () => {
    const matn = getMatn('aljurrumiyya');
    expect(matn?.type).toBe('prose');
    expect(matn?.units.length).toBe(26);
  });

  it('caches a loaded matn (same reference on re-read)', () => {
    expect(getMatn('alimriti')).toBe(getMatn('alimriti'));
  });

  it('returns null for a well-formed id with no content file', () => {
    expect(getMatn('does_not_exist')).toBeNull();
  });
});

describe('empty vs error (acceptance 6, loader behavior)', () => {
  it('a valid but empty manifest returns [] (→ EMPTY state, not an error)', () => {
    const dir = fixtureDir({ 'manifest.json': JSON.stringify({ mutun: [] }) });
    try {
      expect(getMutunIndex(dir)).toEqual([]);
      expect(getMatnIds(dir)).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('a missing manifest THROWS (→ distinct ERROR state)', () => {
    const dir = fixtureDir({});
    try {
      expect(() => getMutunIndex(dir)).toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('a malformed manifest THROWS (→ distinct ERROR state)', () => {
    const dir = fixtureDir({ 'manifest.json': '{ not valid json' });
    try {
      expect(() => getMutunIndex(dir)).toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('a malformed matn content file resolves to null, never fabricated content', () => {
    const dir = fixtureDir({ 'broken.json': '{ "id": "broken" }' });
    try {
      expect(getMatn('broken', dir)).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
