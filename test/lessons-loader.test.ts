import { describe, it, expect, vi } from 'vitest';

// lib/lessons/loader.ts opens with `import 'server-only'`, which throws when
// evaluated outside a React Server Component (i.e. here in vitest's node env).
// Neutralize it so we can unit-test the pure slug guard. Hoisted by vitest
// above the import below.
vi.mock('server-only', () => ({}));

const { getLesson } = await import('@/lib/lessons/loader');

// getLesson() interpolates `slug` into a filesystem path and is reachable with
// an attacker-controlled route param, so it must reject anything that isn't the
// content-file charset (lowercase, digits, '_', '-') before touching the disk.
describe('getLesson slug guard (path-traversal defense)', () => {
  it('rejects a classic ../ traversal payload', () => {
    expect(getLesson('../../etc/passwd', 'ar')).toBeNull();
  });

  it('rejects any slug containing a path separator', () => {
    expect(getLesson('ar/secret', 'ar')).toBeNull();
    expect(getLesson('a\\b', 'ar')).toBeNull();
  });

  it("rejects a '.' so a slug cannot reach into a different extension/file", () => {
    expect(getLesson('manifest.json', 'ar')).toBeNull();
    expect(getLesson('foo.bar', 'en')).toBeNull();
  });

  it('rejects uppercase, spaces, and empty slugs (outside the allowed charset)', () => {
    expect(getLesson('Foo', 'ar')).toBeNull();
    expect(getLesson('a b', 'ar')).toBeNull();
    expect(getLesson('', 'ar')).toBeNull();
  });

  it('still resolves a real lesson slug (underscores allowed)', () => {
    const lesson = getLesson('alafaal_alkhamsa', 'ar');
    expect(lesson).not.toBeNull();
    expect(lesson?.slug).toBe('alafaal_alkhamsa');
  });
});
